const path = require('path');
const flR = require('../util/flR.js');
const ntwrkR = require('../util/ntwrkR.js');
const scrpR = require('../util/scrpR.js');
const mtchR = require('./mtchR.js');
const clnR = require('./clnR.js');

function downloadProgress(filePath, bytesDownloaded, progressEvent) {
    mbLoaded = ((bytesDownloaded + progressEvent.loaded) / (1024 * 1024)).toFixed(2);
    mbTotal = ((bytesDownloaded + progressEvent.total) / (1024*1024)).toFixed(2);
    console.log(`Downloading ${path.basename(filePath)} - ${mbLoaded}mb / ${mbTotal}mb`);
}

function myrientDownloaded(fsPath, platform) {
    // check for zip
    if (flR.check(fsPath)) return false;

    // check for extract types
    const fileName = path.join(path.dirname(fsPath), path.basename(fsPath, path.extname(fsPath)));
    for (const fileType of platform.file_types) {
        if (flR.check(fileName + fileType)) return true;
    }
    
    return false
}

async function myrientDownload(url, fsPath) {
    // get progress
    const bytesDownloaded = flR.check(fsPath) ? flR.size(fsPath) : 0;

    // set up parameters
    const ntwrkRParms = {
        'headers': {
            'Range': `bytes=${bytesDownloaded}-`,
        },
        'responseType': 'stream',
        'onDownloadProgress': progressEvent => downloadProgress(fsPath, bytesDownloaded, progressEvent)
    };

    const data = await ntwrkR.get(url, ntwrkRParms);
    if (!data) return false;

    const flRParms = {
        'flags': bytesDownloaded ? 'a' : 'w'
    }

    await flR.writeStream(fsPath, data, flRParms);
}

function cdromanceDownloaded(fsPath, platform) {
    // check for zip
    if (flR.check(fsPath)) return false;

    const files = flR.read(path.dirname(fsPath));
    if (!files) return;

    const fileName = path.join(path.dirname(fsPath), path.basename(fsPath, path.extname(fsPath)));
    const fileTypes = platform.file_types;
    for (const file of files) {
        if (!fileTypes.includes(path.extname(file))) continue;

        const baseFile = path.basename(file, path.extname(file));
        let points = mtchR.score(baseFile, fileName);
        if (points > 0) return true;
    }

    return false;
}

async function cdromanceDownload(url, fsPath) {
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
    const file = fileElements.filter(le => le.includes('(English'))[0];
    const linkElements = scrpR.getElements(ajaxData, linkSelector, 'href');
    const link = linkElements[fileElements.indexOf(file)];
    fsPath = path.join(fsPath, file);

    const bytesDownloaded = flR.check(fsPath) ? flR.size(fsPath) : 0;

    // set up parameters
    const ntwrkRParms = {
        'headers': {
            'Range': `bytes=${bytesDownloaded}-`,
        },
        'responseType': 'stream',
        'onDownloadProgress': progressEvent => downloadProgress(fsPath, bytesDownloaded, progressEvent)
    };

    const data = await ntwrkR.get(link, ntwrkRParms);
    if (data) {
        const flRParms = {
            'flags': bytesDownloaded ? 'a' : 'w'
        }
        await flR.writeStream(fsPath, data, flRParms);
    }

    return fsPath;
}

function standardizeName(dirPath) {
    const files = flR.read(dirPath);
    if (!files) return;

    const dirName = path.basename(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileType = path.extname(file);

        let trackTag = '';
        const trackMatch = file.replace(/[^A-Za-z0-9\s]/g, ' ').replace(/  +/g, ' ').match(/Track (\d+)/);
        if (trackMatch) trackTag = ` (Track ${trackMatch[1]})`;

        const fileName = dirName + trackTag + fileType;
        flR.rename(filePath, fileName);
    }
}

function flattenExtract(dirPath, game) {
    const files = flR.read(dirPath);
    if (!files) return;

    for (const file of files) {
        const fsPath = path.join(dirPath, file);
        if (!flR.isDir(fsPath)) continue;

        const hasMatchingGame = mtchR.score(game.name, file) > 0;
        if (!hasMatchingGame) continue;

        standardizeName(fsPath);        
        flR.flatten(fsPath);
    }
}

const myrientUrl = 'https://myrient.erista.me/files';
const cdromanceUrl = 'https://cdromance.org';
async function downloadGame(platform, game, fsPath) {
    let filePath;
    if (game.myrient_url) {
        const url = path.join(myrientUrl, platform.myrient_url, game.myrient_url);
        filePath = path.join(fsPath, game.myrient_name);
        if (!myrientDownloaded(filePath, platform, game)) await myrientDownload(url, filePath);
    }
    if (game.cdromance_url) {
        const url = path.join(cdromanceUrl, platform.cdromance_url_game, game.cdromance_url);
        filePath = path.join(fsPath, game.cdromance_name);
        if(!cdromanceDownloaded(filePath, platform, game)) filePath = await cdromanceDownload(url, fsPath);
    }

    if(flR.check(filePath)) {
        await flR.extract(filePath);
        flR.remove(filePath);
        flattenExtract(fsPath, game);
        clnR.cleanPlatformFiles(platform, fsPath);
    }
}

async function download(platforms, fsPath) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            await downloadGame(platform, game, path.join(fsPath, platform.name));
        }
    }
}

module.exports = { download };