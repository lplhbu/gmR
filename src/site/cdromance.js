const path = require('path');
const flR = require('../util/flR.js');
const ntwrkR = require('../util/ntwrkR.js');
const scrpR = require('../util/scrpR.js');
const wtR = require('../util/wtR.js');

const name = 'cdromance';
const dataPath = `./data/site/${name}.json`;
const url = 'https://cdromance.org';
const urlParams = {
    'language': 'english-patched'
};

async function scrapePage(pageUrl) {
    const scrapeData = {};
    const pageData = await ntwrkR.get(pageUrl);
    wtR.wait();

    const pageSelector = '#main > nav > div > a';
    const pageElements = scrpR.getElements(pageData, pageSelector, 'text');
    scrapeData.pages = Math.max(...pageElements.map(e => parseInt(e.match(/\d+/)[0])));

    const nameSelector = '#main > div > div > a';
    const names = scrpR.getElements(pageData, nameSelector, 'text');

    const urlSelector = '#main > div > div > a';
    const urls = scrpR.getElements(pageData, urlSelector, 'href');

    const games = names.map((name, i) => ({
        name,
        url: urls[i].split('/').filter(t => t.trim() !== '').pop()
    }));
    
    scrapeData.games = games;
    return scrapeData;
}

async function scrapePlatform(platform) {
    const games = [];
    const platformName = platform[`${name}_url`];
    if (!platformName) return games;

    urlParams.platform = platformName;
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
        if (data.find(p => p.name === platform.name)) continue;

        const games = await scrapePlatform(platform);
        data.push({ name: platform.name, games });
        flR.write(dataPath, JSON.stringify(data, null, 2));
    }

    return data;
}

async function download(url, fsPath) {
    const pageData = await ntwrkR.get(url);
    const idSelector = '#acf-content-wrapper';
    const idElements = scrpR.getElements(pageData, idSelector, 'attr', 'data-id');
    const id = Number(idElements[0]);

    const ajaxUrl = 'https://cdromance.org/wp-content/plugins/cdromance/public/ajax.php';
    const ajaxParams = {
        params: { post_id: id },
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
    const ajaxData = await ntwrkR.get(ajaxUrl, ajaxParams);
    const linkSelector = 'div.download-links.table a';

    const fileElements = scrpR.getElements(ajaxData, linkSelector, 'text');
    const linkElements = scrpR.getElements(ajaxData, linkSelector, 'href');

    const elements = fileElements.map((file, index) => ({
        file,
        link: linkElements[index]
    })).slice(1);

    const order = [/\ben/g, /\bgdi/g];
    elements.sort((a, b) => {
        const al = a.file.toLowerCase().replace(/\s*[^a-z0-9]\s*/g, ' ');
        const bl = b.file.toLowerCase().replace(/\s*[^a-z0-9]\s*/g, ' ');

        for (const ord of order) {
            const alo = al.match(ord);
            const blo = bl.match(ord);

            if (alo && !blo) return -1;
            if (blo && !alo) return 1;
        }
        return 0;
    });

    const link = elements[0].link;
    fsPath += path.extname(elements[0].file);

    const bytesDownloaded = flR.exists(fsPath) ? flR.getFileSize(fsPath) : 0;
    let skipProgress = 0;
    const ntwrkRParams = {
        headers: { 'Range': `bytes=${bytesDownloaded}-` },
        responseType: 'stream',
        onDownloadProgress: progressEvent => {
            if (skipProgress++ === 0) return;

            const mbLoaded = ((bytesDownloaded + progressEvent.loaded) / (1024 * 1024)).toFixed(2);
            const mbTotal = ((bytesDownloaded + progressEvent.total) / (1024 * 1024)).toFixed(2);
            process.stdout.write(`\rDownloading ${path.basename(fsPath)} - ${mbLoaded}mb / ${mbTotal}mb`);
        }
    };

    const data = await ntwrkR.get(link, ntwrkRParams);
    if (!data) return null;

    const flRParams = { flags: bytesDownloaded ? 'a' : 'w' };
    await flR.writeStream(fsPath, data, flRParams);

    return fsPath;
}

module.exports = { scrape, download, name, dataPath, url, urlParams };
