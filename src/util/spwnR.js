const childProcess = require('child_process');

async function spawn(command, exitCode = 0) {
    let tokens = command
    if (typeof tokens === 'string') tokens = tokens.split(' ');

    const spawned = childProcess.spawn(tokens.shift(), tokens);
    spawned.stdout.on('data', (data) => console.log(`${data}`.trim()));
    spawned.stderr.on('data', (data) => console.error(`${data}`.trim()));

    return new Promise((resolve, reject) => {
        spawned.on('exit', (code) => {
            if (code == exitCode) resolve();
            else reject(new Error(`Process exited with code ${code}`));
        });
    });
}

module.exports = { spawn };
