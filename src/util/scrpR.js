const cheerio = require('cheerio');

function parse(element, type, attribute) {
    let parsed;
    switch(type) {
        case 'text': parsed = element.text().trim(); break;
        case 'number': parsed = Number(element.text().trim()); break;
        case 'href': parsed = element.attr('href'); break;
        case 'attr': parsed = element.attr(attribute); break;
    }
    return parsed
};

function getElements(page, selector, type, attribute = '') {
    let elements = [];
    const $ = cheerio.load(page);
    const pageElements = $(selector);
    for (const element of pageElements) {
        const pageElement = parse($(element), type, attribute);
        if (!pageElement) continue;
        elements.push(pageElement);
        console.log('Scraped: ', pageElement);
    }
    return elements
}

module.exports = { getElements };