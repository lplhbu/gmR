function tokenMatch(str1, str2, debug = false) {
    const tkn1 = str1.replace(/[^a-zA-Z0-9 ']/g, ' ').split(' ').filter(token => token);
    const tkn2 = str2.replace(/[^a-zA-Z0-9 ']/g, ' ').split(' ').filter(token => token);
    const tkn2Save = [...tkn2];

    let count = 0
    for (let token of tkn1) {
        const index = tkn2.indexOf(token);
        if (index !== -1) {
            count++;
            tkn2.splice(index, 1);
        }
    }

    return count / tkn1.length - tkn2.length / tkn2Save.length;
}

module.exports = { tokenMatch };