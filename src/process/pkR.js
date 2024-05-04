function peakPlatform(games, difficulty) {
    // Step 1: Calculate the mean
    const sum = games.reduce((total, game) => total + game.rating, 0);
    const mean = sum / games.length;

    // Step 2: Calculate the standard deviation
    const squaredDifferences = games.map(game => Math.pow(game.rating - mean, 2));
    const variance = squaredDifferences.reduce((total, diff) => total + diff, 0) / games.length;
    const standardDeviation = Math.sqrt(variance);

    // Step 3: Calculate the threshold
    const numStandardDeviations = difficulty * ((5 - mean) / 5);
    const threshold = mean + numStandardDeviations * standardDeviation;

    // Step 4: Filter the games
    const peakGames = games.filter((game) => game.rating > threshold);
    return peakGames;
}

function peak(platforms, difficulty) {
    const peakData = [];
    for (const platform of platforms) {
        const peakGames = peakPlatform(platform.games, difficulty)
        peakData.push({ ...platform, 'games': peakGames });
    }
    return peakData;
}

module.exports = { peak };