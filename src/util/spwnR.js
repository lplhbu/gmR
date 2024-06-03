const childProcess = require('child_process');

async function spawn(command, exitCode = 0) {
    let tokens = command
    if (typeof tokens === 'string') tokens = tokens.split(' ');

    const spawned = childProcess.spawn(tokens.shift(), tokens);
    spawned.stdout.on('data', (data) => process.stdout.write(`${data}`));
    spawned.stderr.on('data', (data) => process.stderr.write(`${data}`));

    return new Promise((resolve, reject) => {
        spawned.on('exit', (code) => {
            if (code == exitCode) resolve();
            else reject(new Error(`Process exited with code ${code}`));
        });
    });
}

module.exports = { spawn };
