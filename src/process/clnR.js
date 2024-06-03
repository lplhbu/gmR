const path = require('path');
const flR = require('../util/flR.js');
const rgxR = require('./rgxR.js');
const mtchR = require('./mtchR.js');
const spwnR = require('../util/spwnR.js');

function cleanData(platforms) {
    cleanPlatformsRelease(platforms);
    cleanPlatformsMulti(platforms);
}

// Remove games released before the platform release
function cleanPlatformsRelease(platforms) {
    for (const platform of platforms) {
        if (!platform.games) continue;

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
            if (!platform.games) continue;

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

async function cleanFiles(fsPath, platforms) {
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

        await cleanDir(dirPath, platform);
    }
}

async function cleanDir(dirPath, platform, name = null) {

    const archiveTypes = ['.zip', '.7z'];
    const fileTypes = [];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);
    const renameFiles = flR.read(dirPath);
    for (const file of renameFiles) {
        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        const filePath = path.join(dirPath, file);

        if (flR.isDir(filePath)) {
            await cleanDir(filePath, platform, name || fileBase);
        } else if (archiveTypes.includes(fileType.toLowerCase())) {
            cleanFile(filePath, platform, name);
            const extracted = renameFiles.some(f => fileTypes.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)) == fileBase);
            if (extracted) flR.remove(filePath);
        } else if (fileTypes.includes(fileType.toLowerCase())) {
            cleanFile(filePath, platform, name);
        } else {
            flR.remove(filePath);
        }
    }

    const compressTypes = ['.cue', '.iso', '.gdi'];
    const compressFiles = flR.read(dirPath);
    for (const file of compressFiles) {
        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        const filePath = path.join(dirPath, file);
        if (compressTypes.includes(fileType.toLowerCase())) {
            const fileNew = fileBase + '.chd';
            if (compressFiles.includes(fileNew)) continue;
            
            const filePathNew = path.join(dirPath, fileNew);
            const command = ['chdman', 'createcd', '-i', filePath, '-o', filePathNew, '-f'];
            await spwnR.spawn(command);
        } 
    }

    const removeTypes = [...compressTypes, '.bin'];
    const removeFiles = flR.read(dirPath);
    for (const file of removeFiles) {
        const fileType = path.extname(file);
        const filePath = path.join(dirPath, file);
        if (removeTypes.includes(fileType.toLowerCase())) {
            flR.remove(filePath);
        }
    }

    if (flR.read(dirPath).length === 0) flR.remove(dirPath);
}

function cleanFile(filePath, platform, name = null) {
    const file = path.basename(filePath);
    const fileType = path.extname(file);
    const fileBase = path.basename(file, fileType);

    if (name == null) {
        if (!platform.games) {
            flR.remove(filePath);
            return;
        }
        const matchNames = mtchR.matchName(fileBase, platform.games.filter(g => g.download != 'skip').map(g => g.name));
        if (matchNames.length === 0) {
            flR.remove(filePath);
            return;
        }
        name = matchNames.find(matchName => cleanName(matchName, null, true, true) == fileBase);
        if (name == null) name = matchNames[0];
    }

    if (fileType.toLowerCase() === '.cue') cleanCue(filePath, name);
    flR.rename(filePath, cleanName(file, name));
}

function cleanCue(filePath, name) {
    let data = flR.read(filePath);

    const fileRegex = /FILE "(.*?)"/g;
    const replaceNames = (match, fileName) => `FILE "${cleanName(fileName, name)}"`;
    const newData = data.replace(fileRegex, replaceNames);
    if (newData != data) flR.write(filePath, newData);
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
