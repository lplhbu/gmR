module.exports = {
    lowerUpper: /([a-z])([A-Z])/g,
    tags: /\(.*?\)|\[.*?\]|\{.*?\}/g,
    coreTags: /\((disc|track) \d+\)/ig,
    nonTagTrack: /\btrack (\d+)\b/ig,
    nonTagDisc: /\bcd(\d+)\b/ig,
    archExt: /(\.(zip|7z))$/ig,
    gameExt: /(\.(nes|sms|pce|gen|md|smd|cue|bin|chd|gb|gg|sfc|smc|32x|vb|n64|v64|z64|ngp|gbc|ngc|cdi|gdi|iso|gba|rvz|nds|pkg|vpk|3ds|cia))$/ig,
    spaces: /\s*[\_]\s*/g,
    dashes: /\s*[\:\;\\\/]\s*/g,
    remove: /[\!\?\.\,\'\"]/g,
    //@ # $ % ^ & * + = < > |
    common: /\s*\b(the|in|of|and)\b\s*/ig,
    number: /(\d+[\.\d+]?)/,
    roman: /^(m{0,3})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/ig,
};
