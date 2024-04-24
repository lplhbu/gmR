const flR = require('./util/flR');
const ntwrkR = require('./util/ntwrkR');
const scrpR = require('./util/scrpR');
const cmprR = require('./util/cmprR');

const path = require('path');

const dir = __dirname;

const configDataPath = path.join(dir, 'config.json');
const platformDataPath = path.join(dir, 'platform.json');

const dataPath = path.join(dir, 'data');
const backloggdDataPath = path.join(dataPath, 'backloggd.json');
const backloggdPeakDataPath = path.join(dataPath, 'backloggd_peak.json');
const myrientDataPath = path.join(dataPath, 'myrient.json');
const myrientPeakDataPath = path.join(dataPath, 'myrient_peak.json');

let gamePath = path.join(dir, 'game');

const waitTime = 100;
async function getPage(url) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return await ntwrkR.get(url);
}

const backloggdUrl = 'https://www.backloggd.com/games/lib/rating/release_platform:';
async function scrapeBackloggd(platform, page) {
    const scrapeData = {};

    const pageUrl = backloggdUrl + (platform.backloggd_name ?? platform.name) + '?page=' + (page ?? 0);
    const pageData = await getPage(pageUrl);

    const pageSelector = 'body > main > div > div.row.mx-0.mt-2 > nav > span.page';
    const pageElements = scrpR.getElements(pageData, pageSelector, 'number');
    scrapeData.pages = Math.max(...pageElements);

    const nameSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div > div.game-text-centered';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const ratingSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div.row.mx-0.star-rating-below';
    const ratings = scrpR.getElements(pageData, ratingSelector, 'number');

    const games = [];
    for (let i = 0; i < Math.min(names.length, ratings.length); i++) {
        const name = names[i];
        const rating = ratings[i];
        games.push({ 'name': name, 'rating': rating });
    }
    scrapeData.games = games;

    return scrapeData;
}

const myrientUrl = 'https://myrient.erista.me/files/';
async function scrapeMyrient(platform) {
    const scrapeData = {};

    const pageUrl = myrientUrl + (platform.myrient_name ?? platform.name);
    const pageData = await getPage(pageUrl);

    const nameSelector = '#list > tbody > tr > td.link > a';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const urlSelector = '#list > tbody > tr > td.link > a';
    const urls = scrpR.getElements(pageData, urlSelector, 'href');

    const games = [];
    for (let i = 0; i < Math.min(names.length, urls.length); i++) {
        const name = names[i];
        const url = urls[i];
        games.push({ 'name': name, 'url': url });
    }
    scrapeData.games = games;

    return scrapeData;
}

function peakGames(games, difficulty) {
    // Step 1: Calculate the mean
    const sum = games.reduce((total, game) => total + game.rating, 0);
    const mean = sum / games.length;

    // Step 2: Calculate the standard deviation
    const squaredDifferences = games.map(game => Math.pow(game.rating - mean, 2));
    const variance = squaredDifferences.reduce((total, diff) => total + diff, 0) / games.length;
    const standardDeviation = Math.sqrt(variance);

    // Step 3: Calculate the threshold
    const numStandardDeviations = difficulty * ((5 - mean) / 5);// + (Math.min(games.length, 500) / 500); // You can adjust this value as needed
    const threshold = mean + numStandardDeviations * standardDeviation;

    // Step 4: Filter the games
    const peakGames = games.filter((game) => game.rating > threshold);
    return peakGames;
}

function cleanGames(platforms) {

    const dirs = flR.readDir(gamePath);

    for (const dir of dirs) {

        const dirPath = path.join(gamePath, dir)
        if (!flR.checkPath(dirPath)) continue;

        const platform = platforms.find(p => p.name == dir);
        if (!platform) {
            flR.deleteAll(dirPath);
            continue;
        }

        const files = flR.readDir(dirPath);
        for (const file of files) {

            const baseFile = path.basename(file, path.extname(file));
            if (platform && platform.myrient_peak_games.find((g) => {
                const baseGame = path.basename(g.name, path.extname(g.name));
                return baseFile.includes(baseGame);
            })) continue;

            const filePath = path.join(dirPath, file);
            flR.deleteFile(filePath);
        }
    }
}

function matchGame(game, games) {
    
    let mostCount = -Infinity;
    let closestGames = [];

    const clean = (str) => {
        str = str.replace(/é/g, 'e');
        str = str.replace(/\$/g, 's');
        str = str.replace(/\([^)]+?\)|\.zip/g, '');
        return str.trim().toLowerCase();
    }

    for (const gamesGame of games) {
        const count = cmprR.tokenMatch(clean(game.name), clean(gamesGame.name));
        if (count < 1) continue;
        
        if (count > mostCount) {
            closestGames = [gamesGame];
            mostCount = count;
        } else if (count == mostCount) {
            closestGames.push(gamesGame);
        }
    }

    const penalize = (str) => {
        const matches = str.match(/\([^)]+?\)/g) || [];
        let points = 0;
        for (const match of matches) {
            let point = 1;

            if (match.includes('USA')) point *= 0;
            if (match.includes('(En,')) point *= 0;
            if (match.includes('(En)')) point *= 0;
            if (match.includes('(Disc ')) point *= 0;

            if (match.includes('World')) point *= 0.2;
            if (match.includes('(RE)')) point *= 0.2;

            if (match.includes('Europe')) point *= 0.4;
            if (match.includes('PAL')) point *= 0.4;

            points += point;
        }
        return points;
    };

    const lowestPenalty = closestGames.reduce((minPenalty, game) => {
        const penalty = penalize(game.name);
        return Math.min(minPenalty, penalty);
    }, Infinity);
    closestGames = closestGames.filter(game => penalize(game.name) == lowestPenalty);

    return closestGames;
}

async function downloadGame(platform, game) {
    const dirPath = path.join(gamePath, platform.name);
    const filePath = path.join(dirPath, game.name);
    const extractPath = path.join(dirPath, path.basename(filePath, path.extname(filePath)) + platform.file_type);
    const extractPathAlt = path.join(dirPath, path.basename(filePath, path.extname(filePath)) + platform.file_type_alt);
    
    // already downloaded
    if (flR.checkPath(extractPath) || flR.checkPath(extractPathAlt)) return true;

    // get progress
    let bytesDownloaded = 0;
    if (flR.checkPath(filePath)) bytesDownloaded = flR.statPath(filePath).size || 0;

    const ntwrkRParms = {
        'headers': {
            'Range': `bytes=${bytesDownloaded}-`,
        },
        'responseType': 'stream',
        'onDownloadProgress': progressEvent => {
            mbDownload = ((bytesDownloaded + progressEvent.loaded) / (1024 * 1024)).toFixed(2);
            mbTotal = ((bytesDownloaded + progressEvent.total) / (1024*1024)).toFixed(2);
            console.log(`${game.name}: ${mbDownload}mb / ${mbTotal}mb`);
        }
    };

    const flRParms = {
        'flags': bytesDownloaded ? 'a' : 'w'
    }

    const url = path.join(myrientUrl, platform.myrient_name, game.url);
    const data = await ntwrkR.get(url, ntwrkRParms);
    if (!data) return false;

    flR.ensureDir(dirPath);
    await flR.saveFileStream(filePath, data, flRParms);
    await flR.extractFile(filePath, path.dirname(filePath));
    await flR.deleteFile(filePath);
    return true;
}

async function main() {

    const configData = JSON.parse(flR.readFile(configDataPath) || '[]');
    const platformData = JSON.parse(flR.readFile(platformDataPath) || '[]');

    const backloggdData = JSON.parse(flR.readFile(backloggdDataPath) || '[]');
    const myrientData = JSON.parse(flR.readFile(myrientDataPath) || '[]');

    const backloggdPeakData = [];
    const myrientPeakData = [];

    if (configData.path) {
        gamePath = '';
        if (configData.relative) gamePath = dir;
        gamePath = path.join(gamePath, configData.path);
    }

    flR.ensureDir(dataPath);
    flR.ensureDir(gamePath);

    const data = [];
    for (const platformName of configData.platforms) {
        platform = platformData.find(p => p.name == platformName);
        if (!platform) continue;
        data.push(platform);

        backloggdPlatform = backloggdData.find(p => p.name == platform.name);
        if (backloggdPlatform) platform.backloggd_games = backloggdPlatform.games;

        backloggdPeakPlatform = backloggdPeakData.find(p => p.name == platform.name);
        if (backloggdPeakPlatform) platform.backloggd_peak_games = backloggdPeakPlatform.games;

        myrientPlatform = myrientData.find(p => p.name == platform.name);
        if (myrientPlatform) platform.myrient_games = myrientPlatform.games;

        myrientPeakPlatform = myrientPeakData.find(p => p.name == platform.name);
        if (myrientPeakPlatform) platform.myrient_peak_games = myrientPeakPlatform.games;
    }

    // scrape backloggd pages
    for (const platform of data) {
        if (platform.backloggd_games) continue;
        
        const games = [];
        let pages = 1;
        for (let page = 1; page <= pages; page++) {
            const scrapeData = await scrapeBackloggd(platform, page);
            if (scrapeData.pages && scrapeData.pages > pages) pages = scrapeData.pages;
            if (scrapeData.games) games.push(...scrapeData.games);
        }

        platform.backloggd_games = games;
        backloggdData.push({'name': platform.name, 'games': games});
        flR.saveFile(backloggdDataPath, JSON.stringify(backloggdData, null, 2));
    }

    // scrape myrient pages
    for (const platform of data) {
        if (platform.myrient_games) continue;

        let games = [];
        const scrapeData = await scrapeMyrient(platform);
        if (scrapeData.games) games = scrapeData.games;

        platform.myrient_games = games;
        myrientData.push({'name': platform.name, 'games': games});
        flR.saveFile(myrientDataPath, JSON.stringify(myrientData, null, 2));
    }

    // find peak data
    for (const platform of data) {
        const games = peakGames(platform.backloggd_games, configData.difficulty);

        platform.backloggd_peak_games = games;
        backloggdPeakData.push({'name': platform.name, 'games': games});
    }
    flR.saveFile(backloggdPeakDataPath, JSON.stringify(backloggdPeakData, null, 2));

    // convert backloggd top games to myrient top games
    for (const platform of data) {
        const games = [];
        for (let game of platform.backloggd_peak_games) {
            myrientGames = matchGame(game, platform.myrient_games);
            if (myrientGames) games.push(...myrientGames);
        }

        platform.myrient_peak_games = games;
        myrientPeakData.push({'name': platform.name, 'games': games});
    };
    flR.saveFile(myrientPeakDataPath, JSON.stringify(myrientPeakData, null, 2));

    // clear old games
    if (configData.clean) {
        await cleanGames(data);
    }

    // download games
    let success = true;
    for (const platform of data) {
        for (const game of platform.myrient_peak_games) {
            success &= await downloadGame(platform, game);
        }
    };

   return success ? -1 : 0;
}

const { spawn } = require('child_process');
async function parent() {
    const scriptProcess = spawn('node', ['gmR.js', 'child']);

    scriptProcess.on('exit', async (code) => {
        if (code == -1) return 0;

        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log(`Main script exited with code ${code}. Restarting...`);
        parent();
    });

    scriptProcess.stdout.on('data', (data) => {
        console.log(`${data}`.trim());
    });

    scriptProcess.stderr.on('data', (data) => {
        console.error(`${data}`.trim());
    });
}

const args = process.argv.slice(2);
if (args.length == 0) parent();
else (main());