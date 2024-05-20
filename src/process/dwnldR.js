const path = require('path');
const flR = require('../util/flR.js');
const myrient = require('../site/myrient.js');
const cdromance = require('../site/cdromance.js');
const mtchR = require('./mtchR.js');
const clnR = require('./clnR.js');
const rgxR = require('./rgxR.js');

function downloaded(fsPath, game, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const matchNames = mtchR.matchName(game.name, files);
    if (matchNames.length == 0) return false;

    const fileTypes = platform.file_types ? platform.file_types : [platform.file_type];

    if (game.download == 'myrient') {
        const gameTags = game.myrient_name.match(rgxR.coreTags) || [];
        const matched = matchNames.some(mn => {
            const matchTags = mn.match(rgxR.coreTags) || [];
            const tagMatch = gameTags.every(gt => matchTags.includes(gt));
            const typeMatch = fileTypes.includes(path.extname(mn));
            return tagMatch && typeMatch;
        });
        if (!matched) return false;
    }
    else {
        const file = matchNames[0];
        if (!fileTypes.includes(path.extname(file))) return false;
    }

    return true;
}

async function downloadGame(platform, game, fsPath) {
    let downloadPath;

    switch (game.download) {
        case 'myrient': {
            const url = path.join(myrient.url, platform.myrient_url, game.myrient_url);
            downloadPath = path.join(fsPath, clnR.cleanName(game.myrient_name, game.name) + path.extname(game.name));
            await myrient.download(url, downloadPath);
        } break;
        case 'cdromance': {
            const url = path.join(cdromance.url, platform.cdromance_url_game || platform.cdromance_url, game.cdromance_url);
            downloadPath = path.join(fsPath, clnR.cleanName(game.name));
            downloadPath = await cdromance.download(url, downloadPath);
        } break;
    }

    return downloadPath;
}

async function extractGame(fsPath) {
    const dir = path.dirname(fsPath);
    const name = path.basename(fsPath, path.extname(fsPath));
    const extractPath = path.join(dir, name);
    await flR.extract(fsPath, extractPath);
    flR.remove(fsPath);
    return extractPath
}

function flattenGame(fsPath, platform) {
    const innerDirs = flR.read(fsPath).filter(file => flR.isDir(path.join(fsPath, file)));
    innerDirs.forEach(id => flattenDir(path.join(fsPath, id), platform));
    flattenDir(fsPath, platform);
    flR.remove(fsPath);
}

function flattenDir(fsPath, platform) {
    clnR.cleanDir(fsPath, platform);
    flR.flatten(fsPath);
}

async function download(platforms, fsPath) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            const platformPath = path.join(fsPath, platform.name); 
            if (downloaded(platformPath, game, platform)) continue;

            const extractPath = path.join(platformPath, clnR.cleanName(game.name));
            if (!flR.check(extractPath)) {
                const downloadPath = await downloadGame(platform, game, platformPath);
                if (downloadPath) await extractGame(downloadPath);
            }

            if (flR.check(extractPath)) flattenGame(extractPath, platform);
        }
    }
}

module.exports = { download };