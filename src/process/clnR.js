const path = require('path');
const flR = require('../util/flR.js');
const regex = require('./regex.js');
const mtchR = require('./mtchR.js');

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
        if (!platform) { flR.remove(dirPath); continue; }

        cleanDir(dirPath, platform);
    }
}

function cleanDir(fsPath, platform, game = null) {
    const files = flR.read(fsPath);
    if (!files) return;

    const fileTypes = ['.zip', '.7z'];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    for (const file of files) {
        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        const filePath = path.join(fsPath, file);

        if (flR.isDir(filePath)) cleanDir(filePath, platform, game || fileBase);
        else if (fileTypes.includes(fileType.toLowerCase())) cleanFile(filePath, platform, game || fileBase);
        else flR.remove(filePath);
    }

    const postFiles = flR.read(fsPath);
    if (postFiles.length == 0) flR.remove(fsPath);
}

function cleanFile(fsPath, platform, game = null) {
    const file = path.basename(fsPath);
    const fileType = path.extname(file);
    const fileBase = path.basename(file, fileType);

    if (game == null) {
        const matchNames = mtchR.matchName(fileBase, platform.games.map(g => g.name));
        if (matchNames.length == 0) { flR.remove(fsPath); return; }
        game = matchNames[0];
    }

    if (fileType.toLowerCase() == '.cue') cleanCue(fsPath, game);
    flR.rename(fsPath, cleanName(file, game));
}

function cleanCue(fsPath, name) {
    let data = flR.read(fsPath);

    const fileRegex = /FILE "(.*?)"/g;
    const replaceNames = (match, fileName) => {
        return `FILE "${cleanName(fileName, name)}"`;
    };

    data = data.replace(fileRegex, replaceNames);
    flR.write(fsPath, data);
}

function cleanName(fileName, name) {
    let standardName = mtchR.cleanName(name);
    
    const tags = fileName.match(regex.coreTags) || [];

    regex.nonTagTrack.lastIndex = 0;
    const track = regex.nonTagTrack.exec(mtchR.cleanName(fileName));
    if (track && track[1]) tags.push(`(Track ${track[1]})`);

    regex.nonTagDisc.lastIndex = 0;
    const disc = regex.nonTagDisc.exec(mtchR.cleanName(fileName));
    if (disc && disc[1]) tags.push(`(Disc ${disc[1]})`);

    if (tags.length > 0) standardName += ' ' + tags.join(' ');

    const fileType = fileName.match(regex.gameExt) || fileName.match(regex.archExt);
    if (fileType.length > 0) standardName += fileType[0].toLowerCase();

    return standardName;
}

module.exports = { cleanData, cleanFiles, cleanDir };