async function wait(time = 1000) {
    await new Promise(resolve => setTimeout(resolve, time));
}

module.exports = { wait };
