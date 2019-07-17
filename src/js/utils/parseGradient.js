export default str => {
    const match = str.match(/(repeating-|)([\w]+).*?[^-\w]+(.*?)([)]$|$)/i);

    if (!match) {
        return null;
    }

    // Extract parts and try to parse gradient
    const normalized = (() => {
        const [, extra, type, content] = match;
        const p = document.createElement('p');
        p.style.backgroundImage = `${extra}${type}-gradient(${content})`;
        return p.style.backgroundImage;
    })();

    if (!normalized) {
        return null;
    }

    // Strict-parse result
    const [, type, content] = normalized.match(/(linear|radial)-gradient\((.*)\)/i);
    const stops = [];
    const regexp = /(rgba?\([\d]+, *[\d]+, *[\d]+(, *[\d]+)?\))([^,]+)/gi;

    // Match color - stop pairs
    for (let match; (match = regexp.exec(content));) {
        const [, color, , locs] = match;

        // Match stops assigned to this color
        const numRegexp = /[\d]+/g;
        for (let loc; (loc = numRegexp.exec(locs));) {
            stops.push({
                loc: Number(loc) / 100,
                color
            });
        }
    }

    return {stops, type};
}
