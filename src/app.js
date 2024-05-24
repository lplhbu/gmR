const config = require('../config/config.js');

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
    const peakData = pkR.peak(platformData, difficulty);
    ldR.load(platformData, peakData, 'name');

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
        if (final) final += '\n';
        final += platform.name + '\n';

        final += '-\n';
        final += platform.average.toFixed(2) + ' Average\n';
        final += platform.deviation.toFixed(2) + ' Deviation\n';
        final += platform.threshold.toFixed(2) + ' Threshold\n';
        
        final += '-\n';
        const uniqueGameNames = new Set(platform.games.map(game => game.name));
        for (const gameName of uniqueGameNames) {
            const game = platform.games.find(game => game.name === gameName);
            final += `${game.rating.toFixed(2)} ${game.name}\n`;
        }
    }
    flR.writeFileSync(`./data/lists/difficulty_${String(data.difficulty).replace('.', '_')}.txt`, final);
}

async function main() {
    const configData = JSON.parse(flR.readFileSync(config.configFile) || '{}');
    const data = { 
        'difficulty': -1,
        'platforms': configData.platforms.map(p => { return { 'name': p }; })
    };

    const allPlatformData = JSON.parse(flR.readFileSync(config.platformsFile) || '[]');
    ldR.load(data.platforms, allPlatformData, 'name');

    const finalData = JSON.parse(flR.readFileSync(config.finalFile) || '[]');
    if (finalData.difficulty == configData.difficulty) ldR.load(data.platforms, finalData.platforms, 'name');
    else await scrapeManipulate(data.platforms, allPlatformData, configData.difficulty);

    data.difficulty = configData.difficulty;
    flR.writeFileSync(config.finalFile, JSON.stringify(data, null, 2));
    list(data);
    
    if (configData.clean) clnR.cleanFiles(config.gamePath, data.platforms);
    await dwnldR.download(config.gamePath, data.platforms);
    process.exit(255);
}

main();
