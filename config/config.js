const flR = require('../src/util/flR.js');

const config = {}
config.gamePath = './game';
config.configFile = './config.json';
config.platformsFile = './config/platforms.json';
config.finalFile = './final.json';

// read settings from user config file
const configData = JSON.parse(flR.read(config.configFile) || '{}');
if (configData.path) config.gamePath = configData.path;
  
module.exports = config;