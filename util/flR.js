const fs = require('fs');
const unzipper = require('unzipper');

async function deleteAll(path) {
    if (statPath(path).isDirectory()) deleteDir(path);
    else deleteFile(path);
}

function checkPath(path) {
    return fs.existsSync(path);
}

function statPath(path) {
    return fs.statSync(path);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readDir(dirPath) {
    return fs.readdirSync(dirPath);
}

async function deleteDir(dirPath) {
    console.log('Deleting dir: ', dirPath);
    try {
        fs.rmSync(dirPath, { recursive: true });
        console.log('Directory and its contents deleted successfully');
    } catch (error) {
        console.error('Error deleting directory');
    }
}

function readFile(filePath) {
    let file;
    console.log('Reading file: ', filePath);
    try {
        file = fs.readFileSync(filePath, 'utf-8');
        console.log('Read successfully');
    } catch (error) {
        console.error('Error reading');
        file = null;
    }
    return file;
}

function saveFile(filePath, data) {
    console.log('Saving file: ', filePath);
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        console.log('Saved successfully');
    } catch (error) {
        console.error('Error saving');
    }
}

async function saveFileStream(filePath, data, parms) {
    console.log('Saving file: ', filePath);

    const writer = fs.createWriteStream(filePath, parms);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log('Saved successfully');
            resolve();
        });

        writer.on('error', error => {
            console.error('Error saving');
            reject(error);
        });

        data.pipe(writer);
    });
}

async function extractFile(filePath, extractPath) {
    console.log('Extracting file: ', filePath);
    try {
        await fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();
        console.log('Extracted successfully');
    } catch (error) {
        console.error('Error extracting');
    }
}

async function deleteFile(filePath) {
    console.log('Deleting file: ', filePath);
    fs.unlink(filePath, (error) => {
        if (error) {
            console.error('Error deleting');
        } else {
            console.log('Deleted successfully');
        }
    });
}

module.exports = { deleteAll, checkPath, statPath, ensureDir, readDir, deleteDir, readFile, saveFile, saveFileStream, extractFile, deleteFile };