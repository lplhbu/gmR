const path = require('path');
const flR = require('../util/flR.js');
const myrient = require('../site/myrient.js');
const cdromance = require('../site/cdromance.js');
const clnR = require('./clnR.js');
const rgxR = require('./rgxR.js');
const spwnR = requirei('./src/util/spwnR.js');

function downloaded(dirPath, platform, game) {
    const files = flR.read(dirPath);
    if (!files) return false;

    const cleanedGameName = clnR.cleanName(game.name, null, true, true);
    const matches = files.filter(file => clnR.cleanName(file, null, true, true) === cleanedGameName);
    if (matches.length == 0) return false;

    const fileTypes = platform.file_types || [platform.file_type];
    switch (game.download) {
        case 'myrient': {
            const gameTags = game.myrient_name.match(rgxR.coreTags) || [];
            for (const match of matches) {
                const matchTags = match.match(rgxR.coreTags) || [];
                const tagsMatch = gameTags.every(tag => matchTags.includes(tag));
                const typeMatch = fileTypes.includes(path.extname(match).toLowerCase());
                if (tagsMatch && typeMatch) return true;
            }
            return false;
        }
        case 'cdromance': {
            for (const match of matches) {
                const typeMatch = fileTypes.includes(path.extname(match).toLowerCase());
                if (typeMatch) return true;
            }
            return false;
        }
        default:
            return false;
    }
}

async function downloadFile(dirPath, platform, game) {
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

async function extract(filePath) {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath, path.extname(filePath));
    const extractPath = path.join(dir, name);
    await flR.extract(filePath, extractPath);
    flR.remove(filePath);
    return extractPath;
}

async function compress(dirPath) {
    const files = flR.read(dirPath);
    if (!files) return false;

    const chdFiles = ['.cue', '.iso', '.gdi'];
    for (const file of files) {
        const fileType = path.extname(file);
        if (!chdFiles.includes(fileType)) continue;

        const filePath = path.join(dirPath, file);
        const fileBase = path.basename(file, fileType);
        const filePathNew = path.join(dirPath, fileBase, '.chd');

        await spwnR.spawn(`chdman createcd -i ${filePath} -o ${filePathNew}`);
    }
}

function flatten(dirPath, platform) {
    const innerDirs = flR.read(dirPath).filter(file => flR.isDir(path.join(dirPath, file)));
    innerDirs.forEach(innerDir => flatten(path.join(dirPath, innerDir), platform));

    clnR.cleanDir(dirPath, platform, path.basename(dirPath));
    flR.flatten(dirPath);
    flR.remove(dirPath);
}

async function download(dirPath, platforms) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            if (!game.download || game.download === 'skip') continue;

            const platformPath = path.join(dirPath, platform.name); 
            if (downloaded(platformPath, platform, game)) continue;

            const extractPath = path.join(platformPath, clnR.cleanName(game[`${game.download}_name`], game.name, false, true));
            if (!flR.exists(extractPath)) {
                const downloadPath = await downloadFile(platformPath, platform, game);
                if (downloadPath) await extract(downloadPath);
            }

            if (flR.exists(extractPath)) {
                if (platform.file_types && platform.file_types.includes('.chd')) await compress(extractPath);
                flatten(extractPath, platform);
            }
        }
    }
}

module.exports = { download };
