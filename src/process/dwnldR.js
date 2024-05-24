const path = require('path');
const flR = require('../util/flR.js');
const myrient = require('../site/myrient.js');
const cdromance = require('../site/cdromance.js');
const mtchR = require('./mtchR.js');
const clnR = require('./clnR.js');
const rgxR = require('./rgxR.js');

function downloaded(dirPath, game, platform) {
    const files = flR.readFileSync(dirPath);
    if (!files) return false;

    const matchNames = mtchR.matchName(game.name, files);
    if (matchNames.length === 0) return false;

    const fileTypes = platform.file_types || [platform.file_type];

    switch (game.download) {
        case 'myrient': {
            const gameTags = game.myrient_name.match(rgxR.coreTags) || [];
            const matched = matchNames.some(mn => {
                const matchTags = mn.match(rgxR.coreTags) || [];
                const tagMatch = gameTags.every(gt => matchTags.includes(gt));
                const typeMatch = fileTypes.includes(path.extname(mn).toLowerCase());
                return tagMatch && typeMatch;
            });
            return matched;
        }
        case 'cdromance': {
            return fileTypes.includes(path.extname(matchNames[0]).toLowerCase());
        }
        default:
            return false;
    }
}

async function downloadGame(dirPath, platform, game) {
    let downloadPath;

    switch (game.download) {
        case 'myrient': {
            const url = path.join(myrient.url, platform.myrient_url, game.myrient_url);
            downloadPath = path.join(dirPath, clnR.cleanName(game.myrient_name, game.name));
            await myrient.download(url, downloadPath);
            break;
        }
        case 'cdromance': {
            const url = path.join(cdromance.url, platform.cdromance_url_game || platform.cdromance_url, game.cdromance_url);
            downloadPath = path.join(dirPath, clnR.cleanName(game.name));
            downloadPath = await cdromance.download(url, downloadPath);
            break;
        }
    }

    return downloadPath;
}

async function extractGame(filePath) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const extractPath = path.join(dir, name);
    await flR.extract(filePath, extractPath);
    flR.remove(filePath);
    return extractPath;
}

function flattenGame(dirPath, platform) {
    const innerDirs = flR.readFileSync(dirPath).filter(file => flR.isDirectory(path.join(dirPath, file)));
    innerDirs.forEach(id => flattenDir(path.join(dirPath, id), platform));
    flattenDir(dirPath, platform);
    flR.remove(dirPath);
}

function flattenDir(dirPath, platform) {
    clnR.cleanDir(dirPath, platform, path.basename(dirPath));
    flR.flattenDirectory(dirPath);
}

async function download(dirPath, platforms) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            if (!game.download) continue;

            const platformPath = path.join(dirPath, platform.name); 
            if (downloaded(platformPath, game, platform)) continue;

            const extractPath = path.join(platformPath, clnR.cleanName(game[`${game.download}_name`], game.name, true));
            if (!flR.fileExists(extractPath)) {
                const downloadPath = await downloadGame(platformPath, platform, game);
                if (downloadPath) await extractGame(downloadPath);
            }

            if (flR.fileExists(extractPath)) flattenGame(extractPath, platform);
        }
    }
}

module.exports = { download };
