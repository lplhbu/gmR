function peakPlatform(games, difficulty) {
    // Step 1: Calculate the mean
    const sum = games.reduce((total, game) => total + game.rating, 0);
    const mean = sum / games.length;

    // Step 2: Calculate the standard deviation
    const variance = games.reduce((total, game) => total + Math.pow(game.rating - mean, 2), 0) / games.length;
    const standardDeviation = Math.sqrt(variance);

    // Step 3: Calculate the threshold
    const numStandardDeviations = difficulty * ((5 - mean) / 5);
    const threshold = mean + numStandardDeviations * standardDeviation;

    // Step 4: Filter the games
    const peakGames = games.filter(game => game.rating > threshold);
    return peakGames;
}

function peak(platforms, difficulty) {
    return platforms.map(platform => ({
        ...platform,
        games: peakPlatform(platform.games, difficulty)
    }));
}

module.exports = { peak };
