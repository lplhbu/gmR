const axios = require('axios');

async function get(url, params = {}) {
    let data;
    console.log('Retrieving:', url);
    try {
        const response = await axios.get(url, params);
        data = response.data;
        console.log('Retrieved successfully');
    } catch (error) {
        console.error('Error retrieving:', error);
        data = null;
    }
    return data;
}

function getParams(params, delimiter, separator) {
    let urlParams = '';
    for (const key in params) {
        if (!params[key]) continue;
        if (urlParams) urlParams += separator;
        urlParams += `${key}${delimiter}${params[key]}`;
    }
    return urlParams;
}

module.exports = { get, getParams };
