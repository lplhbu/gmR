const { exec, spawn } = require('child_process');

const restartTimeout = 10000;

async function install() {
    return new Promise((resolve, reject) => {
        exec('npm install', (error, stdout, stderr) => {
            if (error) {
                console.error(`${error}`);
                reject(error);
            } else {
                console.log(`${stdout}`);
                resolve();
            }
        });
    });
}

async function run() {
    const scriptProcess = spawn('node', ['./src/app.js', 'child']);

    scriptProcess.on('exit', async (code) => {
        // exit on 255
        if (code == 255) return 0;

        console.log(`Main script exited with code ${code}. Restarting in ${restartTimeout/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, restartTimeout));
        parent();
    });

    scriptProcess.stdout.on('data', (data) => console.log(`${data}`.trim()));
    scriptProcess.stderr.on('data', (data) => console.error(`${data}`.trim()));
}

async function parent() {
    await install();
    await run();
}

parent();