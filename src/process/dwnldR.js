const path = require('path');
const flR = require('../util/flR.js');
const myrient = require('../site/myrient.js');
const cdromance = require('../site/cdromance.js');
const { cleanName, matchName } = require('./mtchR.js');
const { standardizeDir } = require('./clnR.js');

function downloaded(fsPath, game, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const matchNames = matchName(game.name, files);
    if (matchNames.length == 0) return false;

    const file = matchNames[0];
    const fileType = path.extname(file);
    const fileTypes = platform.file_types ? platform.file_types : [platform.file_type];
    if (!fileType || !fileTypes.includes(fileType)) return false;

    return true;
}

async function downloadGame(platform, game, fsPath) {
    let downloadPath;

    switch (game.download) {
        case 'myrient': {
            const url = path.join(myrient.url, platform.myrient_url, game.myrient_url);
            downloadPath = path.join(fsPath, cleanName(game.name) + path.extname(game.myrient_name));
            await myrient.download(url, downloadPath);
        } break;
        case 'cdromance': {
            const url = path.join(cdromance.url, platform.cdromance_url_game || platform.cdromance_url, game.cdromance_url);
            downloadPath = path.join(fsPath, cleanName(game.name));
            downloadPath = await cdromance.download(url, downloadPath);
        } break;
    }

    return downloadPath;
}

async function extractGame(fsPath, platform) {
    const dir = path.dirname(fsPath);
    const name = path.basename(fsPath, path.extname(fsPath));
    const extractPath = path.join(dir, name);
    await flR.extract(fsPath, extractPath);

    const innerDirs = flR.read(extractPath).filter(file => flR.isDir(path.join(extractPath, file)));
    innerDirs.forEach(id => flattenDir(path.join(extractPath, id), platform));
    flattenDir(extractPath, platform);
    flR.remove(extractPath);

    flR.remove(fsPath);
}

function flattenDir(fsPath, platform) {
    standardizeDir(fsPath, platform);
    flR.flatten(fsPath);
}

async function download(platforms, fsPath) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            const platformPath = path.join(fsPath, platform.name); 
            if (downloaded(platformPath, game, platform)) continue;

            const downloadPath = await downloadGame(platform, game, platformPath);
            if (downloadPath) await extractGame(downloadPath, platform);
        }
    }
}

module.exports = { download };