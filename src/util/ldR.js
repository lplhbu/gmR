function extractFields(array) {
    return array.map(a => a.split('.')[0]);
}

function consume(array) {
    const val = extractFields(array);
    for (let i = 0; i < array.length; i++) {
        array[i] = array[i].split('.').slice(1).join('.');
    }
    return val;
}

function loadArray(toData, fromData, matches, fromFields, toFields) {
    const thisMatches = consume(matches);
    for (let i = 0; i < toData.length; i++) {
        const to = toData[i];
        const from = fromData.find(from => thisMatches.every(m => to[m] == from[m] || (typeof to[m] == 'object' && typeof from[m] == 'object')));
        if (!from) continue;
        load(to, from, matches.filter(m => m), fromFields ? [...fromFields] : null, toFields ? [...toFields] : null);
    }
}

function loadObject(toData, fromData, matches, fromFields, toFields) {
    const thisFromFields = fromFields ? consume(fromFields) : null;
    const thisToFields = toFields ? consume(toFields) : null;

    if (!thisFromFields || !thisToFields) {
        Object.assign(toData, fromData);
        return toData;
    }

    for (let i = 0; i < Math.min(fromFields.length, toFields.length); i++) {
        if (!fromFields[i] && !toFields[i]) {
            toData[thisToFields[i]] = fromData[thisFromFields[i]];
        } else {
            load(toData[thisToFields[i]], fromData[thisFromFields[i]], [...matches], fromFields ? fromFields.filter(ff => ff) : null, toFields ? toFields.filter(tf => tf) : null);
        }
    }

    return toData;
}

function load(toData, fromData, matches = null, fromFields = null, toFields = null) {
    if (matches && !Array.isArray(matches)) matches = [matches];
    if (fromFields && !Array.isArray(fromFields)) fromFields = [fromFields];
    if (toFields && !Array.isArray(toFields)) toFields = [toFields];

    if (Array.isArray(toData)) {
        loadArray(toData, fromData, matches, fromFields, toFields);
    } else {
        loadObject(toData, fromData, matches, fromFields, toFields);
    }
}

module.exports = { load };
