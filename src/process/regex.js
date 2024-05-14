module.exports = {
    lowerUpper: /([a-z])([A-Z])/g,
    tags: /\((.*?)\)/g,
    nonTagTrack: /(?<!\()Track \d+(?!\))/g,
    archExt: /(\.zip|\.7z)$/g,
    gameExt: /(\.nes|\.sms|\.pce|\.md|\.cue|\.bin|\.gb|\.gg|\.sfc|\.32x|\.vb|\.z64|\.ngp|\.gbc|\.ngc|\.iso|\.gba|\.rvz|\.nds|\.pkg|\.3ds)$/g,
    colon: /\s*[:\\]\s*/g,
    special: /[^A-Za-z0-9\s]/g,
    spaces: /  +/g,
    number: /(\d+[\.\d+]?)/,
    roman: /^(m{0,3})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i,
}