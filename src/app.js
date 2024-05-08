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

async function main() {

    // INIT

    const configData = JSON.parse(flR.read(config.configFile) || '{}');
    const data = configData.platforms.map(p => { return { 'name': p }; });

    const platformData = JSON.parse(flR.read(config.platformsFile) || '[]');
    ldR.load(data, platformData, 'name');

    //SCRAPE 

    const backloggdData = await backloggd.scrape(platformData);
    const myrientData = await myrient.scrape(platformData);
    const cdromanceData = await cdromance.scrape(platformData);

    // MANIPULATE

    ldR.load(data, backloggdData, 'name', 'games', 'games');
    clnR.cleanData(data);

    const peakData = pkR.peak(data, configData.difficulty);
    ldR.load(data, peakData, 'name', 'games', 'games');

    const downloadData = mtchR.matchAll(data, myrientData);
    mtchR.load(downloadData, 'myrient');
    ldR.load(data, downloadData, 'name', 'games', 'games');

    const translateData = mtchR.matchAll(data, cdromanceData);
    mtchR.load(translateData, 'cdromance');
    ldR.load(data, translateData, 'name', 'games', 'games');

    mtchR.choose(data);

    flR.write('./data/process/final.json', JSON.stringify(data, null, 2));

    // let final = '';
    // for (const platform of data) {
    //     if (final) final += '\n';
    //     final += platform.name + '\n';
    //     for (const game of [...new Set(platform.games.map(game => game.name))]) {
    //         final += game + '\n';
    //     }
    // }
    // flR.write(`./data/lists/difficulty_${configData.difficulty}.txt`, final);
    // return;
    
    // DOWNLOAD

    if (configData.clean) clnR.cleanFiles(config.gamePath, data);

    await dwnldR.download(data, config.gamePath);

    process.exit(255);
}

main();