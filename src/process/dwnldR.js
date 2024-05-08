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
        // get file type in download function
        downloadPath = await cdromance.download(url, downloadPath);
    }

    return downloadPath;
}

async function extractGame(game, fsPath, platform) {
    if (!flR.check(fsPath)) return;

    const finalPath = path.dirname(fsPath);
    const extractPath = path.join(finalPath, game.name);

    await flR.extract(fsPath, extractPath);
    flattenDir(extractPath, game, platform);
    flR.remove(fsPath);

    console.log('flatten dir');

    flattenDir(finalPath, game, platform);
    flR.remove(extractPath);
}

function flattenDir(dirPath, game, platform) {
    const files = flR.read(dirPath);
    if (!files) return;
    
    const dirs = files.filter(file => flR.isDir(path.join(dirPath, file)));
    const matchNames = matchName(game.name, dirs, platform);
    if (matchNames.length == 0) return;

    const innerDir = matchNames[0];
    innerPath = path.join(dirPath, innerDir);
    standardizeDir(innerPath, platform);
    flR.flatten(innerPath);
}

async function download(platforms, fsPath) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            const platformPath = path.join(fsPath, platform.name); 
            if (downloaded(platformPath, game, platform)) continue;

            const downloadPath = await downloadGame(platform, game, platformPath);
            await extractGame(game, downloadPath, platform);
        }
    }
}

module.exports = { download };