const fs = require('fs');
const path = require('path');
const unzip = require('unzipper');
const un7z = require('node-7z');


function getRelative(fsPath) {
    if (fsPath[0] != '.') return fsPath;
    return path.join(__dirname, '../../', fsPath);
}

function isDir(fsPath) {
    return fs.statSync(fsPath).isDirectory()
}

function ensure(fsPath) {
    if (!fs.existsSync(fsPath)) fs.mkdirSync(fsPath, { recursive: true });
}

function check(fsPath) {
    return fs.existsSync(fsPath);
}

function size(fsPath) {
    return fs.statSync(fsPath).size;
}

function read(fsPath) {
    let data;
    fsPath = getRelative(fsPath);
    if (!check(fsPath)) return null;
    if (isDir(fsPath)) data = readDir(fsPath);
    else data =  readFile(fsPath);
    return data;
}

function readDir(dirPath) {
    return fs.readdirSync(dirPath);
}

function readFile(filePath) {
    let file;
    console.log('Reading file: ', filePath);
    try {
        file = fs.readFileSync(filePath, 'utf-8');
        console.log('Read successfully');
    } catch (error) {
        console.error('Error reading: ', error);
        file = null;
    }
    return file;
}

function write(filePath, data) {
    console.log('Saving file: ', filePath);
    filePath = getRelative(filePath);
    ensure(path.dirname(filePath));
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log('Saved successfully');
    } catch (error) {
        console.error('Error saving: ', error);
    }
}

async function writeStream(filePath, data, params) {
    console.log('Saving file: ', filePath);
    filePath = getRelative(filePath);
    ensure(path.dirname(filePath));
    const writer = fs.createWriteStream(filePath, params);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log('Saved successfully');
            resolve();
        });

        writer.on('error', error => {
            console.error('Error saving: ', error);
            reject(error);
        });

        data.pipe(writer);
    });
}

async function extract(filePath, extractPath = null) {
    console.log('Extracting file: ', filePath);
    filePath = getRelative(filePath);
    if (!extractPath) extractPath = path.dirname(filePath);
    ensure(extractPath);

    const ext = path.extname(filePath);
    let loaded = 0;
    const total = size(filePath);
    switch (ext) {
        case '.zip': {
            return new Promise((resolve, reject) => {
    
                const readStream = fs.createReadStream(filePath);

                readStream.on('data', chunk => {
                    loaded += chunk.length;
                    const mbLoaded = (loaded / (1024 * 1024)).toFixed(2);
                    const mbTotal = (total / (1024*1024)).toFixed(2);
                    console.log(`Extracting ${path.basename(filePath)} - ${mbLoaded}mb / ${mbTotal}mb`);
                })
                
                const extractStream = unzip.Extract({ path: extractPath });

                extractStream.on('close', () => {
                    console.log('Extracted successfully');
                    resolve();
                });

                extractStream.on('error', error => {
                    console.error('Error extracting: ', error);
                    reject(error);
                });

                readStream.pipe(extractStream);
            });
        }
        case '.7z': {
            return new Promise((resolve, reject) => {

                const stream = un7z.extractFull(filePath, extractPath, {
                    $progress: true
                })
                
                stream.on('progress', function (progress) {
                    loaded = progress.percent * 0.01 * total;
                    const mbLoaded = (loaded / (1024 * 1024)).toFixed(2);
                    const mbTotal = (total / (1024*1024)).toFixed(2);
                    console.log(`Extracting ${path.basename(filePath)} - ${mbLoaded}mb / ${mbTotal}mb`);
                })
                
                stream.on('end', function () {
                    console.log('Extracted successfully');
                    resolve();
                })
                
                stream.on('error', error => {
                    console.error('Error extracting: ', error);
                    reject(error);
                });
            });
        }
        default: {
            return Promise.reject(new Error('Unsupported file format')); // Reject if file format is not supported
        }
    }
}

function remove(fsPath) {
    fsPath = getRelative(fsPath);
    if (!check(fsPath)) return;

    if (isDir(fsPath)) removeDir(fsPath);
    else removeFile(fsPath);
}

function removeDir(dirPath) {
    console.log('Deleting dir: ', dirPath);
    try {
        fs.rmSync(dirPath, { recursive: true });
        console.log('Directory and its contents deleted successfully');
    } catch (error) {
        console.error('Error deleting directory: ', error);
    }
}

function removeFile(filePath) {
    console.log('Deleting file: ', filePath);
    try {
        fs.unlinkSync(filePath);
        console.log('Deleted successfully');
    } catch (error) {
        console.error('Error deleting: ', error);
    }
}

function rename(filePath, fileName) {
    const renamePath = path.join(path.dirname(filePath), fileName);
    if (filePath == renamePath) return;
    console.log('Renaming file: ', filePath);
    fs.renameSync(filePath, renamePath);
    console.log('Renamed file: ', renamePath);
}

function move(filePath, dirPath) {
    const toFilePath = path.join(dirPath, path.basename(filePath));
    fs.renameSync(filePath, toFilePath);
}

function flatten(dirPath) {
    const toDirPath = path.dirname(dirPath);
    
    const files = read(dirPath);
    if (!files) return;

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        move(filePath, toDirPath);
    }
}

module.exports = { isDir, check, size, read, write, writeStream, extract, remove, rename, move, flatten};