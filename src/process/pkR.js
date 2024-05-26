function peakPlatform(platform, difficulty) {
    const games = platform.games.filter(game => game.download != 'skip');
    if (games.length === 0) return;

    // Step 1: Calculate the mean
    const sum = games.reduce((total, game) => total + game.rating, 0);
    platform.mean = sum / games.length;

    // Step 2: Calculate the standard deviation
    const variance = games.reduce((total, game) => total + Math.pow(game.rating - platform.mean, 2), 0) / games.length;
    platform.deviation = Math.sqrt(variance);

    // Step 3: Calculate the threshold
    const numDeviations = difficulty * ((5 - platform.mean) / 5);
    platform.threshold = platform.mean + numDeviations * platform.deviation;

    // Step 4: Skip games under threshold
    platform.games = platform.games.filter(game => game.rating > platform.threshold);
}

function peak(platforms, difficulty) {
    for (const platform of platforms) {
        peakPlatform(platform, difficulty);
    }
}

module.exports = { peak };
