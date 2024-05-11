const ldR = require('../util/ldR.js');
const regex = require('./regex.js');

function cleanName(str) {
    str = str.replace(regex.lowerUpper, '$1 $2');
    str = str.toLowerCase();

    // remove tags and file
    str = str.replace(regex.tags, '');
    str = str.replace(regex.archExt, '');
    str = str.replace(regex.gameExt, '');

    str = str.replace(/'/g, ''); // apostrophe remove
    str = str.replace(/é/g, 'e'); // pokemon
    str = str.replace(/Ō/g, "oo") // okami
    str = str.replace(/\$/g, 's'); // warioware microgames
    str = str.replace(/megaman/g, 'mega man'); // megaman
    str = str.replace(/infamous/g, 'in famous');
    str = str.replace(/^3/, ' cube');

    // replace special characters with spaces, and remove double spaces
    str = str.replace(regex.colon, ' - ');
    str = str.replace(regex.special, ' ');
    str = str.replace(regex.spaces, ' ');

    // separate letters from numbers with a space
    // str = str.replace(/([a-z])(\d)/g, '$1 $2');
    // str = str.replace(/(\d)([a-z])/g, '$1 $2');

    return str.trim();
}

function scoreNames(str1, str2, zeroChecks = [regex.number, regex.roman]) {
    
    const tkn1 = cleanName(str1).split(' ');
    const tkn1Save = [...tkn1];

    const tkn2 = cleanName(str2).split(' ');
    const tkn2Save = [...tkn2];

    for (let i = 0; i < tkn1.length; i++) {
        for (let j = 0; j < tkn2.length; j++) {
            if (tkn1[i] != tkn2[j]) continue;

            tkn1.splice(i--, 1);
            tkn2.splice(j, 1);
            break;
        }
    }

    // take the lowest of matching the two
    let points =  Math.min(
        (tkn1Save.length - tkn1.length) / tkn1Save.length - tkn2.length / tkn2Save.length,
        (tkn2Save.length - tkn2.length) / tkn2Save.length - tkn1.length / tkn1Save.length
    );

    for (const check of zeroChecks) {
        if (tkn1.some(tkn => tkn.match(check))) points = 0;
        if (tkn2.some(tkn => tkn.match(check))) points = 0;
        if (points == 0) break;
    }

    return points;
}

function scoreTag(tag, platform = null) {

    // Discs
    if (tag.includes('(Disc ')) return 1;

    // Regions
    if (tag.includes('(World)') ||
        tag.includes('(USA)') ||
        tag.includes('(NTSC)')) return 1;

    if (tag.includes('USA, ') ||
        tag.includes(', USA')) return 0.8;

    if (tag.includes('(Europe)') ||
        tag.includes('Europe, ') ||
        tag.includes(', Europe') ||
        tag.includes('(PAL)')) return platform && platform.type == "Handheld" ? 0.8 : 0;

    // Language
    if (tag.includes('(English') || 
        tag.includes('(En)')) return 1;

    if (tag.includes('En,') || 
        tag.includes(',En')) return 0.8;

    // Revisions
    if (tag.includes('(RE)')) return 0.8;
    if (tag.includes('(Rev ') || 
        tag.includes('(v') || 
        tag.includes('M)')) { 
        var numberString = tag.match(/\([^)\d]*([\d.]*).*?\)/)[1];
        const firstDotIndex = numberString.indexOf('.');
        let number = Number(numberString.slice(0, firstDotIndex) + '.' + numberString.slice(firstDotIndex + 1).replace(/\./g, ''));
        if (number < 10) number /= 10;
        else if (number < 100) number /= 100;
        else if (number < 1000) number /= 1000;
        else if (number < 10000) number /= 10000;
        return 1 - number;
    }

    // Editions
    if (tag.includes('(GB Compatible)') ||
        tag.includes('(SGB Enhanced)') ||
        tag.includes('(NDSi Enhanced)') ||
        tag.includes('(Wii U Virtual Console)') ||
        tag.includes('(Virtual Console)')) return 0.8;

    // Demos
    if (tag.includes('(Aftermarket)') ||
        tag.includes('(Beta)') ||
        tag.includes('(Demo)') ||
        tag.includes('(Proto)')) return 0;

    return 0.6;
}

function scoreTags(str, platform = null) {
    let points = 1;
    const matches = str.match(/\([^)]+?\)/g) || [];
    for (const match of matches) {
        points *= scoreTag(match, platform);
    }
    return points;
}

function score(name, otherName, platform = null) {
    let points = scoreNames(name, otherName);
    points *= Math.min(scoreTags(name), scoreTags(otherName, platform));
    return points;
}

function matchName(name, names, platform = null) {
    let matchNames = [];
    let highScore = 0.2;
    for (const otherName of names) {
        const points = score(name, otherName, platform);
        if (points == 0) continue;
        
        if (points > highScore) {
            matchNames = [otherName];
            highScore = points;
        } else if (points == highScore) {
            matchNames.push(otherName);
        }
    }
    return matchNames;
}

function matchGame(game, games, platform = null) {
    const matchNames = matchName(game.name, games.map(g => g.name), platform);
    const matchGames = matchNames.map(n => games.find(g => g.name == n));
    return matchGames;
}

// find matching games
function matchAll(platforms, otherPlatforms) {
    const matchData = [];
    for (const platform of platforms) {
        const games = [];

        const otherPlatform = otherPlatforms.find(p => p.name == platform.name);
        if (!otherPlatform) continue;

        for (const game of platform.games) {
            const matchGames = [game, ...matchGame(game, otherPlatform.games, platform)];
            games.push(matchGames);
        }

        matchData.push({ 'name': platform.name, 'games': games });
    }
    return matchData;
}

// parse and load match data
function load(platforms, prepend) {
    for (const platform of platforms) {
        const games = [];
        for (const matches of platform.games) {
            const source = matches.shift();
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const game = {};
                ldR.load(game, source);
                ldR.load(game, match, null, Object.keys(match), Object.keys(match).map(k => prepend + '_' + k));
                matches[i] = game;
            }
            if (matches.length == 0) matches.push(source);
            games.push(...matches);
        }
        platform.games = games;
    }
}

// choose myrient or cdromance
function choose(platforms) {
    for (const platform of platforms) {
        for (const game of platform.games) {

            if (!game.myrient_url) continue;
            if (!game.cdromance_url) continue;

            const myrientScore = score(game.name, game.myrient_name);
            const cdromanceScore = score(game.name, game.cdromance_name);

            if (myrientScore > cdromanceScore) {
                delete game.cdromance_name;
                delete game.cdromance_url;
            }
            else {
                delete game.myrient_name;
                delete game.myrient_url;
            }
        }
    }
}

module.exports = { score, matchName, matchGame, matchAll, load, choose };