const path = require('path');
const flR = require('../util/flR.js');
const ntwrkR = require('../util/ntwrkR.js');
const scrpR = require('../util/scrpR.js');
const wtR = require('../util/wtR.js');

const name = 'backloggd';
const dataPath = `./data/site/${name}.json`;
const url = 'https://www.backloggd.com/games/lib';
const urlParams = {
    'release_year': 'released',
    'category': 'main_game',
};

async function scrapeRatingPage(url, page) {
    const scrapeData = {};

    const pageUrl =  `${url}?page=${page}`;
    const pageData = await ntwrkR.get(pageUrl);
    await wtR.wait();

    const pageSelector = 'body > main > div > div.row.mx-0.mt-2 > nav > span.page';
    const pageElements = scrpR.getElements(pageData, pageSelector, 'number');
    scrapeData.pages = Math.max(...pageElements);

    const nameSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div > div.game-text-centered';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const ratingSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div.row.mx-0.star-rating-below';
    const ratings = scrpR.getElements(pageData, ratingSelector, 'text');

    const games = [];
    for (let i = 0; i < Math.min(names.length, ratings.length); i++) {
        const name = names[i];
        const rating = Number(ratings[i]);
        games.push({ 'name': name, 'rating': rating });
    }
    scrapeData.games = games;

    return scrapeData;
}

async function scrapeRatings(platform) {
    const games = [];

    const platformName = platform[`${name}_url`]
    if (!platformName) return games;

    urlParams['release_platform'] = platformName;
    const ratingUrl = path.join(url, 'rating', ntwrkR.getParams(urlParams, ':', ';'));
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
        scrapeData = await scrapeRatingPage(ratingUrl, page);
        if (scrapeData.pages) pages = Math.max(pages, scrapeData.pages);
        if (scrapeData.games) games.push(...scrapeData.games);
    }

    return games;
}

async function scrapeDatePage(pageUrl) {
    const scrapeData = {};

    const pageData = await ntwrkR.get(pageUrl);
    await wtR.wait();

    const pageSelector = 'body > main > div > div.row.mx-0.mt-2 > nav > span.page';
    const pageElements = scrpR.getElements(pageData, pageSelector, 'number');
    scrapeData.pages = Math.max(...pageElements);

    const nameSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div > div.game-text-centered';
    const names = scrpR.getElements(pageData, nameSelector, 'text');
    
    const releaseSelector = 'body > main > div > div.row.show-release.toggle-fade.mx-n1 > div > div.row.mx-0.release-below > p';
    const releases = scrpR.getElements(pageData, releaseSelector, 'text');

    const games = [];
    for (let i = 0; i < Math.min(names.length, releases.length); i++) {
        const name = names[i];
        const release = releases[i];
        games.push({ 'name': name, 'release': release });
    }
    scrapeData.games = games;

    return scrapeData;
}

async function scrapeDates(platform) {
    const games = [];

    const platformName = platform[`${name}_url`]
    if (!platformName) return games;

    urlParams['release_platform'] = platformName;
    const dateUrl = path.join(url, 'release', ntwrkR.getParams(urlParams, ':', ';'));
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
        const pageUrl = `${dateUrl}?page=${page}`;
        const scrapeData = await scrapeDatePage(pageUrl);
        if (scrapeData.pages) pages = Math.max(pages, scrapeData.pages);
        if (scrapeData.games) games.push(...scrapeData.games);
    }

    return games;
}

async function scrape(platforms) {
    const data = JSON.parse(flR.read(dataPath) || '[]');

    for (const platform of platforms) {
        const existingPlatform = data.find(p => p.name == platform.name);
        if (existingPlatform) continue;

        const ratingGames = await scrapeRatings(platform);
        const dateGames = await scrapeDates(platform);
        const games = ratingGames.map(ratingGame => {
            const dateGame = dateGames.find(dateGame => dateGame.name == ratingGame.name);
            if (dateGame) return { ...ratingGame, ...dateGame };
            return ratingGame;
        })
        data.push({ 'name': platform.name, 'games': games });
        flR.write(dataPath, JSON.stringify(data, null, 2));
    }

    return data
}

module.exports = { scrape,
    name, dataPath, url, urlParams
};
