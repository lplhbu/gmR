const ldR = require('../util/ldR.js');
const rgxR = require('./rgxR.js');

function cleanName(str, deep = false) {

    str = str.replace(rgxR.tags, '');
    str = str.replace(rgxR.archExt, '');
    str = str.replace(rgxR.gameExt, '');

    if (deep) {
        str = str.replace(rgxR.lowerUpper, '$1 $2');
        str = str.toLowerCase();
    
        str = str.replace(/'/g, ''); // apostrophe remove
        str = str.replace(/é/g, 'e'); // pokemon
        str = str.replace(/ō/g, "oo") // okami Ōkami
        str = str.replace(/\$/g, 's'); // warioware microgames
        str = str.replace(/megaman/g, 'mega man'); // megaman
        str = str.replace(/infamous/g, 'in famous');
        str = str.replace(/³/g, ' cube');
        str = str.replace(/\^3/g, ' cube');
        str = str.replace(/a telltale games series/g, '');
        str = str.replace(/^portal$/g, 'the orange box');
    
        str = str.replace(/taisen/g, 'wars');
        str = str.replace(/gyakuten kenji/g, 'ace attorney investigations');
        str = str.replace(/eiyuu densetsu/g, 'the legend of heroes');
        str = str.replace(/sora no kiseki/g, 'trails in the sky');
        str = str.replace(/no densetsu/g, 'the legend of');
        str = str.replace(/kono yo no hate de koi o utau shoujo/g, 'a girl who chants love at the bound of this world');
    
        str = str.replace(rgxR.common, ' ');

    }

    str = str.replace(rgxR.spaces, ' ');
    str = str.replace(rgxR.dashes, ' - ');
    str = str.replace(rgxR.remove, '');

    return str.trim();
}

const seriesRegex = /^sc|3rd$/g
const zeroChecks = [rgxR.number, rgxR.roman, seriesRegex];
function scoreNames(str1, str2) {
    
    const tkn1All = cleanName(str1, true).split(' ');
    const tkn2All= cleanName(str2, true).split(' ');
    const tkn1Used = tkn1All.filter(token => tkn2All.includes(token));
    const tkn2Used = tkn2All.filter(token => tkn1All.includes(token));
    const tkn1Left = tkn1All.filter(token => !tkn2All.includes(token));
    const tkn2Left = tkn2All.filter(token => !tkn1All.includes(token));

    const points1 = tkn1Used.length / tkn1All.length;
    const points2 = tkn2Used.length / tkn2All.length;
    const minPoints = Math.min(points1, points2);
    const maxPoints = Math.max(points1, points2);

    let points = (points1 * points2);
    points += (maxPoints - minPoints) * maxPoints * 0.8;

    // if (tkn1All.includes('baroque') && tkn2All.includes('baroque')) {
    //     console.log(tkn1All);
    //     console.log(tkn2All);
    // }

    for (const check of zeroChecks) {
        if (tkn1Left.some(tkn => tkn.match(check)) && !tkn1Used.some(tkn => tkn.match(check))) points = 0;
        if (tkn2Left.some(tkn => tkn.match(check)) && !tkn2Used.some(tkn => tkn.match(check))) points = 0;
        if (points == 0) break;
    }

    return points;
}

function scoreTag(tag) {

    // Demos
    if (tag.includes('(Beta)') ||
        tag.includes('(Demo)') ||
        tag.includes('(DLC)') ||
        tag.includes('(Proto)') ||
        tag.includes('(Trial)') ||
        tag.includes('(Theme)') ||
        tag.includes('(Soundtrack)') ||
        tag.includes('(Avatar)')) return 0;

    // Discs
    if (tag.includes('(Disc ')) return 1;

    // Regions
    if (tag.includes('(World)') ||
        tag.includes('(USA)') ||
        tag.includes('(NTSC)') ||
        tag.includes('(English') || 
        tag.includes('(En)')) return 1;

    if (tag.includes('USA, ') ||
        tag.includes(', USA') ||
        tag.includes('En,') || 
        tag.includes(',En')) return 1;

    // Editions
    if (tag.includes('(RE)') ||
        tag.includes('(GB Compatible)') ||
        tag.includes('(SGB Enhanced)') ||
        tag.includes('(NDSi Enhanced)') ||
        tag.includes('(Wii U Virtual Console)') ||
        tag.includes('(Virtual Console)') ||
        tag.includes('(Aftermarket)')||
        tag.includes('(Unl)')) return 0.96;

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

    if (tag.includes('(Europe)') ||
        tag.includes('Europe, ') ||
        tag.includes(', Europe') ||
        tag.includes('(PAL)')) return 0.84;

    if (tag.includes('(Japan)') ||
        tag.includes('Japan, ') ||
        tag.includes(', Japan')) return 0.8;

    return 0.64;
}

function scoreTags(str) {
    let points = 1;
    const matches = str.match(/\([^)]+?\)/g) || [];
    for (const match of matches) {
        points *= scoreTag(match);
    }
    return points;
}

const scoreThreshold = 0.5;
function score(name, otherName) {
    let points = scoreNames(name, otherName);
    points *= scoreTags(otherName);
    return points;
}

function matchName(name, names) {
    let matchNames = [];
    let highScore = scoreThreshold;
    for (const otherName of names) {
        const points = score(name, otherName);
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

function matchGame(game, games) {
    const matchNames = matchName(game.name, games.map(g => g.name));
    const matchGames = matchNames.map(n => { return { ...games.find(g => g.name == n) }; });
    matchGames.forEach(mg => mg.score = score(game.name, mg.name));
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
            const matchGames = [game, ...matchGame(game, otherPlatform.games)];
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
            game.download = 'none';
            if (game.myrient_score > scoreThreshold) game.download = 'myrient';
            if (game.cdromance_score > (game.myrient_score || scoreThreshold)) game.download = 'cdromance';
        }
    }
}

module.exports = { score, cleanName, matchName, matchGame, matchAll, load, choose };