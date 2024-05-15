const path = require('path');
const flR = require('../util/flR.js');
const myrient = require('../site/myrient.js');
const cdromance = require('../site/cdromance.js');
const { matchName } = require('./mtchR.js');
const { standardizeDir } = require('./clnR.js');

function downloaded(fsPath, game, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const matchNames = matchName(game.name, files, platform);
    if (matchNames.length == 0) return false;

    const file = matchNames[0];
    const fileTypes = platform.file_types ? platform.file_types : [platform.file_type];
    if (!fileTypes.includes(path.extname(file))) return false;

    return true;
}

async function downloadGame(platform, game, fsPath) {
    let downloadPath;

    if (game.myrient_url) {
        const url = path.join(myrient.url, platform.myrient_url, game.myrient_url);
        downloadPath = path.join(fsPath, game.name + path.extname(game.myrient_name));
        await myrient.download(url, downloadPath);
    }

    if (game.cdromance_url) {
        const url = path.join(cdromance.url, platform.cdromance_url_game || platform.cdromance_url, game.cdromance_url);
        downloadPath = path.join(fsPath, game.name);
        downloadPath = await cdromance.download(url, downloadPath);
    }

    return downloadPath;
}

async function extractGame(fsPath, platform) {
    const { dir, name } = path.parse(fsPath);
    const extractPath = path.join(dir, name);
    await flR.extract(fsPath, extractPath);

    const innerDir = flR.read(extractPath).find(file => flR.isDir(path.join(extractPath, file)));
    if (innerDir) flattenDir(path.join(extractPath, innerDir), platform);
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