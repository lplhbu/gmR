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
    wtR.wait();

    const nameSelector = '#list > tbody > tr > td.link > a';
    const urlSelector = '#list > tbody > tr > td.link > a';

    const names = scrpR.getElements(pageData, nameSelector, 'text');
    const urls = scrpR.getElements(pageData, urlSelector, 'href');

    const games = names.map((name, i) => ({ 'name': name, 'url': urls[i] }));
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
        const existingPlatform = data.find(p => p.name === platform.name);
        if (existingPlatform) continue;

        const games = await scrapePlatform(platform);
        data.push({ 'name': platform.name, 'games': games });
        flR.write(dataPath, JSON.stringify(data, null, 2));
    }

    return data;
}

async function download(url, fsPath) {
    const bytesDownloaded = flR.exists(fsPath) ? flR.getFileSize(fsPath) : 0;

    const ntwrkRParams = {
        headers: {
            'Range': `bytes=${bytesDownloaded}-`,
        },
        responseType: 'stream',
        onDownloadProgress: progressEvent => {
            const mbLoaded = ((bytesDownloaded + progressEvent.loaded) / (1024 * 1024)).toFixed(2);
            const mbTotal = ((bytesDownloaded + progressEvent.total) / (1024 * 1024)).toFixed(2);
            process.stdout.write(`\rDownloading ${path.basename(fsPath)} - ${mbLoaded}mb / ${mbTotal}mb`);
        }
    };

    const data = await ntwrkR.get(url, ntwrkRParams);

    if (!data) return false;

    const flRParams = { flags: bytesDownloaded ? 'a' : 'w' };

    await flR.writeStream(fsPath, data, flRParams);
}

module.exports = { scrape, download, name, dataPath, url, urlParams };
