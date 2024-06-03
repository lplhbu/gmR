const spwnR = require('./src/util/spwnR.js');
const wtR = require('./src/util/wtR.js');

const restartTimeout = 10000;
async function main() {
    await spwnR.spawn('npm install');

    while (true) {
        try { 
            await spwnR.spawn('node ./src/app.js', 255);
            break;
        }
        catch (error) {
            console.log(`Restarting in ${restartTimeout / 1000}s...`);
            wtR.wait(restartTimeout);
        }
    }
}

main();
