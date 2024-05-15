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

    //SCRAPE 

    const backloggdData = await backloggd.scrape(allPlatformData);
    const myrientData = await myrient.scrape(allPlatformData);
    const cdromanceData = await cdromance.scrape(allPlatformData);

    // MANIPULATE

    ldR.load(platformData, backloggdData, 'name', 'games', 'games');
    clnR.cleanData(platformData);

    const peakData = pkR.peak(platformData, difficulty);
    ldR.load(platformData, peakData, 'name', 'games', 'games');

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
        for (const game of [...new Set(platform.games.map(game => game.name))]) {
            final += game + '\n';
        }
    }
    flR.write(`./data/lists/difficulty_${data.difficulty}.txt`, final);
}

async function main() {

    // INIT

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
    
    // DOWNLOAD

    if (configData.clean) clnR.cleanFiles(config.gamePath, data.platforms);

    await dwnldR.download(data.platforms, config.gamePath);

    process.exit(255);
}

main();