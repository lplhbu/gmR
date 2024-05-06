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

        cleanPlatform(dirPath, platform);
    }
}

function cleanPlatform(fsPath, platform) {
    const files = flR.read(fsPath);
    if (!files) return;

    const fileTypes = ['.zip', '.7z'];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    for (const file of files) {
        const filePath = path.join(fsPath, file);

        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        
        if (!fileTypes.includes(fileType)) flR.remove(filePath);
        else {
            const noMatchingGame = platform.games.every(game => mtchR.score(game.name, fileBase) < 0.2);
            if (noMatchingGame) flR.remove(filePath);
        }   
    }

    const postFiles = flR.read(fsPath);
    if (postFiles.length == 0) flR.remove(fsPath);
}

module.exports = { cleanPlatformsRelease, cleanPlatformsMulti, cleanFiles, cleanPlatform };