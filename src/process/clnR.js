const path = require('path');
const flR = require('../util/flR.js');
const { matchName } = require('./mtchR.js');
const regex = require('./regex.js');

function cleanData(platforms) {
    cleanPlatformsRelease(platforms);
    cleanPlatformsMulti(platforms);
}

// given platform, remove games released before platform release
function cleanPlatformsRelease(platforms) {
    for (const platform of platforms) {
        platform.games = platform.games.filter(game => new Date(platform.release) <= new Date(game.release));
    }
}

// given platforms, remove games released on later platforms
function cleanPlatformsMulti(platforms) {
    for (const platform of platforms) {
        for (const otherPlatform of platforms) {
            if (platform == otherPlatform) continue;
            if (new Date(platform.release) > new Date(otherPlatform.release)) continue;

            for (const game of platform.games) {
                for (let i = 0; i < otherPlatform.games.length; i++) {
                    const otherGame = otherPlatform.games[i];
                    if (game.name != otherGame.name) continue;
                    if (new Date(game.release) > new Date(otherGame.release)) continue;

                    otherPlatform.games.splice(i--, 1);
                }
            }
        }
    }
}

function cleanFiles(fsPath, platforms) {
    const dirs = flR.read(fsPath);
    if (!dirs) return;
    
    for (const dir of dirs) {
        const dirPath = path.join(fsPath, dir);

        const platform = platforms.find(p => p.name == dir);
        if (!platform) {
            flR.remove(dirPath);
            continue;
        }

        cleanPlatform(dirPath, platform);
    }
}

function cleanPlatform(fsPath, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const archTypes = ['.zip', '7z'];
    const fileTypes = [];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    for (const file of files) {
        const filePath = path.join(fsPath, file);

        const fileType = path.extname(file);
        if (archTypes.includes(fileType)) continue;
        if (!fileTypes.includes(fileType)) { flR.remove(filePath); continue; }

        const matchNames = matchName(file, platform.games.map(g => g.name), platform);
        if (matchNames.length == 0) { flR.remove(filePath); continue; }

        standardizeFile(filePath, matchNames[0]);
    }

    const postFiles = flR.read(fsPath);
    if (postFiles.length == 0) flR.remove(fsPath);
}

function standardizeDir(fsPath, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const fileTypes = ['.zip', '.7z'];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    const dirName = path.basename(fsPath);
    for (const file of files) {
        const filePath = path.join(fsPath, file);
        if (fileTypes.includes(path.extname(file))) standardizeFile(filePath, dirName);
        else flR.remove(filePath);
    }
}

function standardizeFile(fsPath, name) {

    const fileName = path.basename(fsPath);
    
    // const tags = fileName.match(regex.tags) || [];
    const tags = fileName.match(regex.coreTags) || [];
    const track = fileName.match(regex.nonTagTrack);
    if (track && track[1]) tags.push(`(${track[1]})`);

    const ext = fileName.match(regex.gameExt) || fileName.match(regex.archExt);

    flR.rename(fsPath, `${cleanName(name)} ${tags.join(' ')}${ext}`);
}

function cleanName(name) {
    return name.replace(regex.tags, '')
    .replace(regex.gameExt, '')
    .replace(regex.archExt, '')
    .replace(regex.colon, ' - ')
    .trim();
}

module.exports = { cleanData, cleanFiles, cleanPlatform, standardizeDir, standardizeFile };