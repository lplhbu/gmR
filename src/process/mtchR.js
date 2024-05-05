function cleanName(str) {
    str = str.toLowerCase();

    // remove tags and file
    str = str.replace(/\((.*?)\)|\.zip/g, '');

    // remove apostrophe
    str = str.replace(/'/g, '');
    // replace special characters with spaces
    str = str.replace(/[^A-Za-z0-9\s]/g, ' ');
    // remove double spaces created
    str = str.replace(/  +/g, ' ');

    // separate letters from numbers with a space
    // str = str.replace(/([a-z])(\d)/g, '$1 $2');
    // str = str.replace(/(\d)([a-z])/g, '$1 $2');

    // get rid of weird letters
    str = str.replace(/é/g, 'e'); // pokemon
    str = str.replace(/Ō/g, "oo") // okami
    str = str.replace(/\$/g, 's'); // warioware microgames

    // weird mega man spelling
    str = str.replace('megaman', 'mega man'); 

    return str.trim();
}

const numberRegex = /^[+-]?\d+(\.\d+)?$/;
const romanRegex =  /^(m{0,3})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;
function scoreNames(str1, str2, zeroChecks = [numberRegex, romanRegex]) {
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

function scoreTag(tag) {
    // Regions
    if (tag.includes('(World)')) return 1;
    if (tag.includes('(USA)')) return 0.9;
    if (tag.includes('USA, ') || tag.includes(', USA')) return 0.8;
    if (tag.includes('(Europe)')) return 0.7;
    if (tag.includes(', Europe') || tag.includes('Europe, ')) return 0.6;

    if (tag.includes('(NTSC)')) return 0.9;
    if (tag.includes('(PAL)')) return 0.8;

    if (tag.includes('(En)')) return 0.9;
    if (tag.includes('En,') || tag.includes(',En')) return 0.8;

    // Revisions
    if (tag.includes('(Rev ')) return 0.9;
    if (tag.includes('(RE)')) return 0.9;

    // Discs
    if (tag.includes('(Disc ')) return 1;

    // Hard Exits
    if (tag.includes('(Demo)')) return 0;
    if (tag.includes('(Beta)')) return 0;

    return 0.5;
}

function scoreTags(str) {
    let points = 1;
    const matches = str.match(/\([^)]+?\)/g) || [];
    for (const match of matches) {
        points *= scoreTag(match);
    }
    return points;
}

function score(name, otherName) {
    let points = scoreNames(name, otherName);
    points *= Math.min(scoreTags(name), scoreTags(otherName));
    return points;
}

function matchGame(game, games) {
    let matchGames = [];

    let highScore = 0;
    for (const otherGame of games) {
        const points = score(game.name, otherGame.name);
        if (points == 0) continue;
        
        if (points > highScore) {
            matchGames = [otherGame];
            highScore = points;
        } else if (points == highScore) {
            matchGames.push(otherGame);
        }
    }

    return matchGames;
}

// find matching games
function match(platforms, otherPlatforms) {
    const matchData = [];
    for (const platform of platforms) {
        const games = [];

        const otherPlatform = otherPlatforms.find(p => p.name == platform.name);
        if (!otherPlatform) continue;

        for (const game of platform.games) {
            const matchGames = [game, ...matchGame(game, otherPlatform.games)];
            games.push(matchGames);
        }

        matchData.push({ 'name': platform.name, 'games': games });
    }
    return matchData;
}

// parse and load match data
const ldR = require('../util/ldR.js');
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

module.exports = { score, match, load, choose };