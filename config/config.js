const path = require('path');
const flR = require('../src/util/flR.js');

const config = {}
// config.rootPath = path.join(__dirname, '..');
//config.dataPath = 'data';
config.gamePath = './game';
config.configFile = './config.json';
config.platformsFile = './config/platforms.json';

// read settings from user config file
const configData = JSON.parse(flR.read(config.configFile) || '{}');
if (configData.path) config.gamePath = (configData.relative ? './' : '') + configData.path;
  
module.exports = config;