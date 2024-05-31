const path = require('path');
const flR = require('../util/flR.js');
const rgxR = require('./rgxR.js');
const mtchR = require('./mtchR.js');

function cleanData(platforms) {
    cleanPlatformsRelease(platforms);
    cleanPlatformsMulti(platforms);
}

// Remove games released before the platform release
function cleanPlatformsRelease(platforms) {
    for (const platform of platforms) {
        for (const game of platform.games) {
            if (!game.release) continue;
            if (new Date(platform.release) <= new Date(game.release)) continue;

            game.download = 'skip';
            game.reason = 're_release';
        }
    }
}

// Remove games released on later platforms
function cleanPlatformsMulti(platforms) {
    for (const platform of platforms) {
        for (const otherPlatform of platforms) {
            if (platform === otherPlatform) continue;
            if (new Date(platform.release) <= new Date(otherPlatform.release)) continue;

            for (const game of platform.games) {
                for (const otherGame of otherPlatform.games) {
                    if (game.name !== otherGame.name) continue;

                    game.download = 'skip';
                    game.reason = 're_release';
                }
            }
        }
    }
}

function cleanFiles(fsPath, platforms) {
    console.log('Cleaning files:', fsPath);

    const dirs = flR.read(fsPath);
    if (!dirs) return;

    for (const dir of dirs) {
        const dirPath = path.join(fsPath, dir);

        const platform = platforms.find(p => p.name === dir);
        if (!platform) { 
            flR.remove(dirPath); 
            continue; 
        }

        cleanDir(dirPath, platform);
    }
}

function cleanDir(fsPath, platform, name = null) {
    const files = flR.read(fsPath);
    if (!files) return;

    const archiveTypes = ['.zip', '.7z'];
    const fileTypes = [];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    for (const file of files) {
        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        const filePath = path.join(fsPath, file);

        if (flR.isDir(filePath)) {
            cleanDir(filePath, platform, name || fileBase);
        } else if (archiveTypes.includes(fileType.toLowerCase())) {
            cleanFile(filePath, platform, name);
            const extracted = files.some(f => fileTypes.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)) == fileBase);
            if (extracted) flR.remove(filePath);
        } else if (fileTypes.includes(fileType.toLowerCase())) {
            cleanFile(filePath, platform, name);
        } else {
            flR.remove(filePath);
        }
    }

    const postFiles = flR.read(fsPath);
    if (postFiles.length === 0) flR.remove(fsPath);
}

function cleanFile(fsPath, platform, name = null) {
    const file = path.basename(fsPath);
    const fileType = path.extname(file);
    const fileBase = path.basename(file, fileType);

    if (name == null) {
        const matchNames = mtchR.matchName(fileBase, platform.games.filter(g => g.download != 'skip').map(g => g.name));
        if (matchNames.length === 0) {
            flR.remove(fsPath);
            return;
        }
        name = matchNames.find(matchName => cleanName(matchName, null, true, true) == fileBase);
        if (name == null) name = matchNames[0];
    }

    if (fileType.toLowerCase() === '.cue') cleanCue(fsPath, name);
    flR.rename(fsPath, cleanName(file, name));
}

function cleanCue(fsPath, name) {
    let data = flR.read(fsPath);

    const fileRegex = /FILE "(.*?)"/g;
    const replaceNames = (match, fileName) => `FILE "${cleanName(fileName, name)}"`;

    const newData = data.replace(fileRegex, replaceNames);
    if (newData != data) flR.write(fsPath, data);
}

function cleanName(name, newName = null, skipTags = false, skipFileType = false) {
    let cleanName = mtchR.cleanName(newName || name);

    if (!skipTags) {
        const tags = name.match(rgxR.coreTags) || [];

        const trackMatch = mtchR.cleanName(name).match(rgxR.nonTagTrack);
        if (trackMatch && trackMatch.length > 1 && trackMatch[1]) {
            tags.push(`(Track ${trackMatch[1]})`);
        }
    
        const discMatch = mtchR.cleanName(name).match(rgxR.nonTagDisc);
        if (discMatch && discMatch.length > 1 && discMatch[1]) {
            tags.push(`(Disc ${discMatch[1]})`);
        }
    
        if (tags.length > 0) {
            cleanName += ' ' + tags.join(' ');
        }
    }

    if (!skipFileType) {
        const fileType = path.extname(name);
        if (fileType) {
            cleanName += fileType.toLowerCase();
        }
    }

    return cleanName;
}

module.exports = { cleanData, cleanFiles, cleanDir, cleanName };
