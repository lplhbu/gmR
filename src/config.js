const flR = require('../src/util/flR.js');

const config = {
    gamePath: './game',
    configFile: './config.json',
    platformsFile: './data/platforms.json',
    finalFile: './data/final.json'
};

// Read settings from the user config file
const configData = JSON.parse(flR.readFileSync(config.configFile) || '{}');
if (configData.path) {
    config.gamePath = configData.path;
}

module.exports = config;
