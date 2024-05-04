const { spawn } = require('child_process');

const restartTimeout = 10000;

async function parent() {
    const scriptProcess = spawn('node', ['./src/app.js', 'child']);

    scriptProcess.on('exit', async (code) => {
        // -1 is true exit
        if (code == 255) return 0;

        // otherwise restart
        console.log(`Main script exited with code ${code}. Restarting in ${restartTimeout/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, restartTimeout));
        parent();
    });

    // pass log/error to stdout/stderr
    scriptProcess.stdout.on('data', (data) => console.log(`${data}`.trim()));
    scriptProcess.stderr.on('data', (data) => console.error(`${data}`.trim()));
}

parent();