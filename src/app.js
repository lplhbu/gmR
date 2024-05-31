const config = require('./config.js');

const flR = require('./util/flR.js');
const ldR = require('./util/ldR.js');
const backloggd = require('./site/backloggd.js');
const myrient = require('./site/myrient.js');
const cdromance = require('./site/cdromance.js');
const pkR = require('./process/pkR.js');
const clnR = require('./process/clnR.js');
const mtchR = require('./process/mtchR.js');
const dwnldR = require('./process/dwnldR.js');

async function scrapeManipulate(platformData, allPlatformData, difficulty) {
    const backloggdData = await backloggd.scrape(allPlatformData);
    const myrientData = await myrient.scrape(allPlatformData);
    const cdromanceData = await cdromance.scrape(allPlatformData);

    ldR.load(platformData, backloggdData, 'name', 'games', 'games');
    clnR.cleanData(platformData);
    pkR.peak(platformData, difficulty);

    const downloadData = mtchR.matchAll(platformData, myrientData);
    mtchR.load(downloadData, 'myrient');
    ldR.load(platformData, downloadData, 'name', 'games', 'games');

    const translateData = mtchR.matchAll(platformData, cdromanceData);
    mtchR.load(translateData, 'cdromance');
    ldR.load(platformData, translateData, 'name', 'games', 'games');

    mtchR.choose(platformData);
}

function list(data) {
    let final = '';
    for (const platform of data.platforms) {
        if (!platform.games) continue;

        const games = platform.games.filter(game => game.download !== 'skip');
        if (games.length == 0) continue;

        if (final) final += '\n';

        final += platform.name + '\n';
        final += platform.mean.toFixed(2) + ' Mean\n';
        final += platform.deviation.toFixed(2) + ' Deviation\n';
        final += platform.threshold.toFixed(2) + ' Threshold\n';
        final += '-\n';

        const uniqueGameNames = new Set(games.map(game => game.name));
        for (const gameName of uniqueGameNames) {
            const game = games.find(game => game.name === gameName);
            final += `${game.rating.toFixed(2)} ${game.name}\n`;
        }
    }
    flR.write(`./data/list.txt`, final);
}

function skip(data) {
    let final = '';
    for (const platform of data.platforms) {
        if (!platform.games) continue;

        const games = platform.games.filter(game => game.download === 'skip');
        if (games.length == 0) continue;

        if (final) final += '\n';

        final += platform.name + '\n';
        final += '-\n';

        const uniqueGameNames = new Set(games.map(game => game.name));
        for (const gameName of uniqueGameNames) {
            const game = games.find(game => game.name === gameName);
            let reason = game.reason;
            if (reason === 'game_type') reason = game.type;
            final += `${game.name} - skip reason: ${reason}\n`;
        }
    }
    flR.write(`./data/skip.txt`, final);
}

async function main() {
    const configData = JSON.parse(flR.read(config.configFile) || '{}');
    const data = { 
        'difficulty': -1,
        'platforms': configData.platforms.map(p => { return { 'name': p }; })
    };

    const allPlatformData = JSON.parse(flR.read(config.platformsFile) || '[]');
    ldR.load(data.platforms, allPlatformData, 'name');

    const finalData = JSON.parse(flR.read(config.finalFile) || '[]');
    if (finalData.difficulty == configData.difficulty) ldR.load(data.platforms, finalData.platforms, 'name');
    else await scrapeManipulate(data.platforms, allPlatformData, configData.difficulty);

    data.difficulty = configData.difficulty;
    flR.write(config.finalFile, JSON.stringify(data, null, 2));

    list(data);
    skip(data);
    
    clnR.cleanFiles(config.gamePath, data.platforms);
    await dwnldR.download(config.gamePath, data.platforms);
    process.exit(255);
}

main();
