// async function wait(time = 1000) {
//     await new Promise(resolve => setTimeout(resolve, time));
// }

function wait(time = 1000) {
    const start = Date.now();
    while (Date.now() - start < time) {
        // Busy wait
    }
}

module.exports = { wait };
