const path = require('path');
const flR = require('../util/flR.js');
const ntwrkR = require('../util/ntwrkR.js');
const scrpR = require('../util/scrpR.js');
const wtR = require('../util/wtR.js');

const name = 'myrient';
const dataPath = `./data/site/${name}.json`;
const url = 'https://myrient.erista.me/files';
const urlParams = {};

async function scrapePage(pageUrl) {
    const scrapeData = {};

    const pageData = await ntwrkR.get(pageUrl);
    await wtR.wait();

    const nameSelector = '#list > tbody > tr > td.link > a';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const urlSelector = '#list > tbody > tr > td.link > a';
    const urls = scrpR.getElements(pageData, urlSelector, 'href');

    const games = [];
    for (let i = 0; i < Math.min(names.length, urls.length); i++) {
        const name = names[i];
        const url = urls[i];
        games.push({ 'name': name, 'url': url });
    }
    scrapeData.games = games;

    return scrapeData;
}

async function scrapePlatform(platform) {
    const games = [];

    const platformName = platform[`${name}_url`];
    if (!platformName) return games;

    const platformUrl = path.join(url, platformName);
    const scrapeData = await scrapePage(platformUrl);
    if (scrapeData.games) games.push(...scrapeData.games);

    return games;
}

async function scrape(platforms) {
    const data = JSON.parse(flR.read(dataPath) || '[]');

    for (const platform of platforms) {
        const existingPlatform = data.find(p => p.name == platform.name);
        if (existingPlatform) continue;

        const games = await scrapePlatform(platform);
        data.push({ 'name': platform.name, 'games': games });
        flR.write(dataPath, JSON.stringify(data, null, 2));
    }
    return data
}

async function download(url, fsPath) {
    // get progress
    const bytesDownloaded = flR.check(fsPath) ? flR.size(fsPath) : 0;

    // set up parameters
    const ntwrkRParms = {
        'headers': {
            'Range': `bytes=${bytesDownloaded}-`,
        },
        'responseType': 'stream',
        'onDownloadProgress': progressEvent => {
            mbLoaded = ((bytesDownloaded + progressEvent.loaded) / (1024 * 1024)).toFixed(2);
            mbTotal = ((bytesDownloaded + progressEvent.total) / (1024*1024)).toFixed(2);
            console.log(`Downloading ${path.basename(fsPath)} - ${mbLoaded}mb / ${mbTotal}mb`);
        }
    };

    const data = await ntwrkR.get(url, ntwrkRParms);
    if (!data) return false;

    const flRParms = {
        'flags': bytesDownloaded ? 'a' : 'w'
    }

    await flR.writeStream(fsPath, data, flRParms);
}

module.exports = { scrape, download,
    name, dataPath, url, urlParams
};