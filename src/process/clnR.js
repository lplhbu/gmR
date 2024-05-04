// given platform, remove games released before platform release
function cleanPlatformsRelease(platforms) {
    for (platform of platforms) {
        platform.games = platform.games.filter(game => new Date(platform.release) <= new Date(game.release));
    }
}

// given platforms, remove games released on later platforms
function cleanPlatformsMulti(platforms) {
    for (platform of platforms) {
        for (otherPlatform of platforms) {
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

const path = require('path');
const flR = require('../util/flR.js');
const mtchR = require('./mtchR.js');
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

        // iterate platform folders
        const files = flR.read(dirPath);
        if (!files) return;

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const baseFile = path.basename(file, path.extname(file));

            const hasMatchingGame = platform.games.some(game => mtchR.score(game.name, baseFile) > 0);
            if (hasMatchingGame) continue;

            flR.remove(filePath);
        }

        const postFiles = flR.read(dirPath);
        if (postFiles.length == 0) flR.remove(dirPath);
    }
}

function cleanPlatformFiles(platform, fsPath) {
    const files = flR.read(fsPath);
    if (!files) return;

    for (const file of files) {
        const filePath = path.join(fsPath, file);

        const fileType = path.extname(file);
        const fileTypes = [...platform.file_types, '.zip', '.7z'];
        
        if (!fileTypes.includes(fileType)) flR.remove(filePath);
    }

    const postFiles = flR.read(fsPath);
    if (postFiles.length == 0) flR.remove(fsPath);
}

module.exports = { cleanPlatformsRelease, cleanPlatformsMulti, cleanFiles, cleanPlatformFiles };