const ldR = require('../util/ldR.js');
const rgxR = require('./rgxR.js');

function cleanName(str, deep = false) {
    str = str.replace(rgxR.tags, '')
             .replace(rgxR.archExt, '')
             .replace(rgxR.gameExt, '');

    str = str.replace(rgxR.spaces, ' ')
             .replace(rgxR.dashes, ' - ')
             .replace(rgxR.remove, '');

    if (deep) {
        str = str.replace(rgxR.lowerUpper, '$1 $2')
                 .toLowerCase()
                 .replace(/é/g, 'e') // pokemon
                 .replace(/ō/g, 'oo') // okami Ōkami
                 .replace(/\$/g, 's') // warioware microgames
                 .replace(/megaman/g, 'mega man') // megaman
                 .replace(/infamous/g, 'in famous')
                 .replace(/³/g, ' cube')
                 .replace(/\^3/g, ' cube')
                 .replace(/a telltale games series/g, '')
                 .replace(/^portal$/g, 'the orange box')
                 .replace(/taisen/g, 'wars')
                 .replace(/gyakuten kenji/g, 'ace attorney investigations')
                 .replace(/eiyuu densetsu/g, 'the legend of heroes')
                 .replace(/sora no kiseki/g, 'trails in the sky')
                 .replace(/no densetsu/g, 'the legend of')
                 .replace(/kono yo no hate de koi o utau shoujo/g, 'a girl who chants love at the bound of this world')
                 .replace(rgxR.common, ' ');
    }

    return str.trim();
}

const seriesRegex = /^sc|3rd$/ig;
const zeroChecks = [rgxR.number, rgxR.roman, seriesRegex];

function scoreNames(str1, str2) {
    const tkn1All = cleanName(str1, true).split(' ');
    const tkn2All = cleanName(str2, true).split(' ');
    const tkn1Used = [];
    const tkn2Used = [];
    const tkn1Left = [...tkn1All];
    const tkn2Left = [...tkn2All];

    for (let i = 0; i < tkn1Left.length; i++) {
        for (let j = 0; j < tkn2Left.length; j++) {
            if (tkn1Left[i] !== tkn2Left[j]) continue;

            tkn1Used.push(...tkn1Left.splice(i--, 1));
            tkn2Used.push(...tkn2Left.splice(j--, 1));
            break;
        }
    }

    const points1 = tkn1Used.length / tkn1All.length;
    const points2 = tkn2Used.length / tkn2All.length;
    const minPoints = Math.min(points1, points2);
    const maxPoints = Math.max(points1, points2);

    let points = points1 * points2;
    points += (maxPoints - minPoints) * maxPoints * 0.8;

    for (const check of zeroChecks) {
        if (tkn1Left.some(tkn => tkn.match(check)) && !tkn1Used.some(tkn => tkn.match(check))) points = 0;
        if (tkn2Left.some(tkn => tkn.match(check)) && !tkn2Used.some(tkn => tkn.match(check))) points = 0;
        if (points === 0) break;
    }

    return points;
}

function scoreTag(tag) {
    const demoTags = ['(Beta)', '(Demo)', '(DLC)', '(Proto)', '(Trial)', '(Theme)', '(Soundtrack)', '(Avatar)'];
    const discTags = ['(Disc '];
    const regionTags = ['(World)', '(USA)', '(NTSC)', '(English', '(En)', 'USA, ', ', USA', 'En,', ',En'];
    const editionTags = ['(RE)', '(GB Compatible)', '(SGB Enhanced)', '(NDSi Enhanced)', '(Wii U Virtual Console)', '(Virtual Console)', '(Aftermarket)', '(Unl)'];
    const revisionTags = ['(Rev ', '(v', 'M)'];
    const regionScores = {
        '(Europe)': 0.84, 'Europe, ': 0.84, ', Europe': 0.84, '(PAL)': 0.84,
        '(Japan)': 0.8, 'Japan, ': 0.8, ', Japan': 0.8
    };

    if (demoTags.some(demoTag => tag.includes(demoTag))) return 0;
    if (discTags.some(discTag => tag.includes(discTag))) return 1;
    if (regionTags.some(regionTag => tag.includes(regionTag))) return 1;
    if (editionTags.some(editionTag => tag.includes(editionTag))) return 0.96;

    if (revisionTags.some(revisionTag => tag.includes(revisionTag))) {
        const numberString = tag.match(/\([^)\d]*([\d.]*).*?\)/)[1];
        const firstDotIndex = numberString.indexOf('.');
        let number = Number(numberString.slice(0, firstDotIndex) + '.' + numberString.slice(firstDotIndex + 1).replace(/\./g, ''));
        number /= [1, 10, 100, 1000, 10000].find(div => number < div);
        return 1 - number;
    }

    for (const [regionTag, score] of Object.entries(regionScores)) {
        if (tag.includes(regionTag)) return score;
    }

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
        if (points === 0) continue;
        if (points > highScore) {
            matchNames = [otherName];
            highScore = points;
        } else if (points === highScore) {
            matchNames.push(otherName);
        }
    }
    return matchNames;
}

function matchGame(game, games) {
    const matchNames = matchName(game.name, games.map(g => g.name));
    const matchGames = matchNames.map(n => ({ ...games.find(g => g.name === n) }));
    matchGames.forEach(mg => mg.score = score(game.name, mg.name));
    return matchGames;
}

function matchAll(platforms, otherPlatforms) {
    const matchData = [];
    for (const platform of platforms) {
        if (!platform.games) continue;
        const games = [];

        const otherPlatform = otherPlatforms.find(p => p.name === platform.name);
        if (!otherPlatform) continue;

        for (const game of platform.games) {
            const matchGames = [game, ...matchGame(game, otherPlatform.games)];
            games.push(matchGames);
        }

        matchData.push({ name: platform.name, games });
    }
    return matchData;
}

function load(platforms, prepend) {
    for (const platform of platforms) {
        if (!platform.games) continue;

        const games = [];
        for (const matches of platform.games) {
            const source = matches.shift();
            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const game = {};
                ldR.load(game, source);
                ldR.load(game, match, null, Object.keys(match), Object.keys(match).map(k => `${prepend}_${k}`));
                matches[i] = game;
            }
            if (matches.length === 0) matches.push(source);
            games.push(...matches);
        }
        platform.games = games;
    }
}

function choose(platforms) {
    for (const platform of platforms) {
        if (!platform.games) continue;
        
        for (const game of platform.games) {
            if (game.download === 'skip') continue;

            if (game.myrient_score > scoreThreshold) game.download = 'myrient';
            else if (game.cdromance_score > (game.myrient_score || scoreThreshold)) game.download = 'cdromance';
            else {
                game.download = 'skip';
                game.reason = 'not_available';
            }
        }
    }
}

module.exports = { score, cleanName, matchName, matchGame, matchAll, load, choose };
