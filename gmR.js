const spwnR = requirei('./src/util/spwnR.js');
const wtR = require('./src/util/wtR.js');

const restartTimeout = 10000;
async function main() {
    await spwnR.spawn('node ./src/app.js');

    while (true) {
        try { 
            await spwnR.spawn('node ./src/app.js', 255);
            break;
        }
        catch (error) {
            console.log(`Restarting in ${restartTimeout / 1000}s...`);
            await wtR.wait(restartTimeout);
        }
    }
}

main();
