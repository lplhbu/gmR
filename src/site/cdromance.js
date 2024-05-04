const path = require('path');
const flR = require('../util/flR.js');
const ntwrkR = require('../util/ntwrkR.js');
const scrpR = require('../util/scrpR.js');
const wtR = require('../util/wtR.js');

const name = 'cdromance';
const dataPath = `./data/site/${name}.json`;
const url = 'https://cdromance.org';
const urlParams = {
    'language': 'english-patched',
    'platform': 'none'
};

async function scrapePage(pageUrl) {
    const scrapeData = {};

    const pageData = await ntwrkR.get(pageUrl);
    await wtR.wait();

    const pageSelector = '#main > nav > div > a';
    const pageElements = scrpR.getElements(pageData, pageSelector, 'text');
    scrapeData.pages = Math.max(...pageElements.map(e => parseInt(e.match(/\d+/)[0])));

    const nameSelector = '#main > div > div > a';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const urlSelector = '#main > div > div > a';
    const urls = scrpR.getElements(pageData, urlSelector, 'href');

    const games = [];
    for (let i = 0; i < Math.min(names.length, urls.length); i++) {
        const name = names[i];
        const url = urls[i].split('/').filter(t => t.trim() !== '').pop();
        games.push({ 'name': name, 'url': url });
    }
    scrapeData.games = games;

    return scrapeData;
}

async function scrapePlatform(platform) {
    const games = [];

    const platformName = platform[`${name}_url`];
    if (!platformName) return games;

    urlParams['platform'] = platformName;
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
        const pageUrl = path.join(url, 'translations/page', String(page), '?' + ntwrkR.getParams(urlParams, '=', '&'));
        const scrapeData = await scrapePage(pageUrl, page);
        if (scrapeData.pages) pages = Math.max(pages, scrapeData.pages);
        if (scrapeData.games) games.push(...scrapeData.games);
    }

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

module.exports = { scrape }