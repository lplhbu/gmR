const fs = require('fs');
const path = require('path');
const unzip = require('unzipper');
const un7z = require('node-7z');

function getAbsolutePath(fsPath) {
    return fsPath.startsWith('.') ? path.join(__dirname, '../../', fsPath) : fsPath;
}

function isDir(fsPath) {
    return fs.statSync(fsPath).isDirectory();
}

function ensureDir(fsPath) {
    if (!fs.existsSync(fsPath)) {
        fs.mkdirSync(fsPath, { recursive: true });
    }
}

function exists(fsPath) {
    return fs.existsSync(fsPath);
}

function getFileSize(fsPath) {
    return fs.statSync(fsPath).size;
}

function read(fsPath) {
    fsPath = getAbsolutePath(fsPath);
    if (!exists(fsPath)) return null;
    if (isDir(fsPath)) {
        return fs.readdirSync(fsPath);
    } else {
        console.log('Reading file:', fsPath);
        try {
            const data = fs.readFileSync(fsPath, 'utf-8');
            console.log('Read successfully');
            return data;
        } catch (error) {
            console.error('Error reading:', error);
            return null;
        }
    }
}

function write(filePath, data) {
    console.log('Saving file:', filePath);
    filePath = getAbsolutePath(filePath);
    ensureDir(path.dirname(filePath));
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log('Saved successfully');
    } catch (error) {
        console.error('Error saving:', error);
    }
}

async function writeStream(filePath, data, params) {
    console.log('Saving file:', filePath);
    filePath = getAbsolutePath(filePath);
    ensureDir(path.dirname(filePath));
    const writer = fs.createWriteStream(filePath, params);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log('Saved successfully');
            resolve();
        });
        writer.on('error', error => {
            console.error('Error saving:', error);
            reject(error);
        });
        data.pipe(writer);
    });
}

async function extract(filePath, extractPath = null) {
    console.log('Extracting file:', filePath);
    filePath = getAbsolutePath(filePath);
    if (!extractPath) extractPath = path.dirname(filePath);
    ensureDir(extractPath);

    const ext = path.extname(filePath);
    let loaded = 0;
    const total = getFileSize(filePath);

    switch (ext) {
        case '.zip':
            return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(filePath);
                readStream.on('data', chunk => {
                    loaded += chunk.length;
                    const mbLoaded = (loaded / (1024 * 1024)).toFixed(2);
                    const mbTotal = (total / (1024 * 1024)).toFixed(2);
                    process.stdout.write(`\rExtracting ${path.basename(filePath)} - ${mbLoaded}mb / ${mbTotal}mb`);
                });
                const extractStream = unzip.Extract({ path: extractPath });
                extractStream.on('close', () => {
                    console.log('Extracted successfully');
                    resolve();
                });
                extractStream.on('error', error => {
                    console.error('Error extracting:', error);
                    reject(error);
                });
                readStream.pipe(extractStream);
            });
        case '.7z':
            return new Promise((resolve, reject) => {
                const stream = un7z.extractFull(filePath, extractPath, { $progress: true });
                stream.on('progress', progress => {
                    loaded = progress.percent * 0.01 * total;
                    const mbLoaded = (loaded / (1024 * 1024)).toFixed(2);
                    const mbTotal = (total / (1024 * 1024)).toFixed(2);
                    process.stdout.write(`\rExtracting ${path.basename(filePath)} - ${mbLoaded}mb / ${mbTotal}mb`);
                });
                stream.on('end', () => {
                    console.log('Extracted successfully');
                    resolve();
                });
                stream.on('error', error => {
                    console.error('Error extracting:', error);
                    reject(error);
                });
            });
        default:
            return Promise.reject(new Error('Unsupported file format'));
    }
}

function remove(fsPath) {
    fsPath = getAbsolutePath(fsPath);
    if (!exists(fsPath)) return;

    if (isDir(fsPath)) {
        console.log('Deleting directory:', fsPath);
        try {
            fs.rmSync(fsPath, { recursive: true });
            console.log('Directory and its contents deleted successfully');
        } catch (error) {
            console.error('Error deleting directory:', error);
        }
    } else {
        console.log('Deleting file:', fsPath);
        try {
            fs.unlinkSync(fsPath);
            console.log('Deleted successfully');
        } catch (error) {
            console.error('Error deleting:', error);
        }
    }
}

function rename(fsPath, newName) {
    const newPath = path.join(path.dirname(fsPath), newName);
    if (fsPath === newPath) return;
    console.log('Renaming:', fsPath);
    fs.renameSync(fsPath, newPath);
    console.log('Renamed:', newPath);
    return newPath;
}

function move(fsPath, newDir) {
    const newPath = path.join(newDir, path.basename(fsPath));
    if (fsPath === newPath) return;
    console.log('Moving:', fsPath);
    fs.renameSync(fsPath, newPath);
    console.log('Moved:', newPath);
    return newPath;
}

function flatten(dirPath) {
    const dirPathNew = path.dirname(dirPath);
    const files = read(dirPath);
    if (!files) return;

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        move(filePath, dirPathNew);
    }
}

module.exports = {
    isDir,
    exists,
    getFileSize,
    read,
    write,
    writeStream,
    extract,
    remove,
    rename,
    move,
    flatten
};
