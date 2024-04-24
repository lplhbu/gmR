const axios = require('axios');

async function get(url, parms = {}) {
    let data;
    console.log('Retreiving: ', url);
    try {
        const response = await axios.get(url, parms);
        data = response.data;
        console.log('Retrieved successfully');
    } catch (error) {
        console.error('Error retrieving');
        data = null;
    }
    return data;
}

module.exports = { get };