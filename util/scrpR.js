const cheerio = require('cheerio');

function getElements(page, selector, type) {
    let elements = [];

    let parser = (() => {
        switch(type) {
            case 'text': return (element) => { return element.text().trim(); }
            case 'number': return (element) => { return Number(element.text().trim()); }
            case 'href': return (element) => { return element.attr('href'); }
        }
    })();

    const $ = cheerio.load(page);
    const pageElements = $(selector);
    
    for (const element of pageElements) {
        const pageElement = parser($(element));
        if (!pageElement) continue;
        elements.push(pageElement);
    }

    return elements
}

module.exports = { getElements };