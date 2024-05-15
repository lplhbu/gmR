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


async function download(url, fsPath) {
    const pageData = await ntwrkR.get(url);
    const idSelector = '#acf-content-wrapper';
    const idElements = scrpR.getElements(pageData, idSelector, 'attr', 'data-id');
    const id = Number(idElements[0]);

    const ajaxUrl = 'https://cdromance.org/wp-content/plugins/cdromance/public/ajax.php';
    const ajaxParm = {
        params: {
            post_id: id
        },
        referrer: url,
        headers: {
            'Accept': '*/*',
            'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        referrerPolicy: 'no-referrer-when-downgrade',
        mode: 'cors',
        cache: 'default',
        redirect: 'follow'
    };
    const ajaxData = await ntwrkR.get(ajaxUrl, ajaxParm);
    const linkSelector = 'div.download-links.table a';
    const fileElements = scrpR.getElements(ajaxData, linkSelector, 'text');
    const file = fileElements.filter(le => le.includes('English'))[0];
    const linkElements = scrpR.getElements(ajaxData, linkSelector, 'href');
    const link = linkElements[fileElements.indexOf(file)];
    fsPath = fsPath + path.extname(file);

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

    const data = await ntwrkR.get(link, ntwrkRParms);
    if (!data) return fsPath;

    const flRParms = {
        'flags': bytesDownloaded ? 'a' : 'w'
    }
    await flR.writeStream(fsPath, data, flRParms);

    return fsPath;
}

module.exports = { scrape, download,
    name, dataPath, url, urlParams
};