module.exports = {
    lowerUpper: /([a-z])([A-Z])/g,
    tags: /\(.*?\)|\[.*?\]|\{.*?\}/g,
    coreTags: /\((Disc|Track) \d+\)/g,
    nonTagTrack: /\btrack (\d+)\b/g,
    nonTagDisc: /\bcd(\d+)\b/g,
    archExt: /(\.zip|\.7z)$/g,
    gameExt: /(\.nes|\.sms|\.pce|\.md|\.cue|\.bin|\.gb|\.gg|\.sfc|\.32x|\.vb|\.z64|\.ngp|\.gbc|\.ngc|\.iso|\.gba|\.rvz|\.nds|\.pkg|\.3ds)$/g,
    spaces: /\s*[\_]\s*/g,
    dashes: /\s*[\:\;\\\/]\s*/g,
    remove: /[\!\?\.\,\'\"]/g,
    //@ # $ % ^ & * + = < > |
    common: /\s*\b(the|in|of|and)\b\s*/g,
    number: /(\d+[\.\d+]?)/,
    roman: /^(m{0,3})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i,
}