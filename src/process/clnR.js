const path = require('path');
const flR = require('../util/flR.js');
const regex = require('./regex.js');
const { cleanName, matchName } = require('./mtchR.js');

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

    const archTypes = ['.zip', '.7z'];
    const fileTypes = [];
    if (platform.file_type) fileTypes.push(platform.file_type);
    if (platform.file_types) fileTypes.push(...platform.file_types);

    for (const file of files) {
        const fileType = path.extname(file);
        const fileBase = path.basename(file, fileType);
        const filePath = path.join(fsPath, file);

        if (archTypes.includes(fileType)) continue;
        if (!fileTypes.includes(fileType)) { flR.remove(filePath); continue; }

        const matchNames = matchName(fileBase, platform.games.map(g => g.name));
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
    if (path.extname(fsPath) == '.cue') standardizeCue(fsPath, name);
    flR.rename(fsPath, standardName(path.basename(fsPath), name));
}

function standardName(fileName, name) {
    let standardName = cleanName(name);
    
    const tags = fileName.match(regex.coreTags) || [];
    const track = regex.nonTagTrack.exec(cleanName(fileName).toLowerCase());
    if (track && track[1]) tags.push(`(Track ${track[1]})`);
    const disc = regex.nonTagDisc.exec(cleanName(fileName).toLowerCase());
    if (disc && disc[1]) tags.push(`(Disc ${disc[1]})`);
    if (tags.length > 0) standardName += ' ' + tags.join(' ');

    const fileType = fileName.match(regex.gameExt) || fileName.match(regex.archExt);
    standardName += fileType;

    return standardName;
}

function standardizeCue(fsPath, name) {
    let data = flR.read(fsPath);

    const fileRegex = /FILE "(.*?)"/g;
    const replaceNames = (match, fileName) => {
        return `FILE "${standardName(fileName, name)}"`;
    };

    data = data.replace(fileRegex, replaceNames);
    flR.write(fsPath, data);
}

module.exports = { cleanData, cleanFiles, cleanPlatform, standardizeDir, standardizeFile };