async function wait(time = 100) {
    await new Promise(resolve => setTimeout(resolve, time));
}

module.exports = { wait }