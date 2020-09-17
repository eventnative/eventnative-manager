function circularReferencesReplacer() {
    let cache = [];
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            // Duplicate reference found, discard key
            if (cache.includes(value)) return;

            // Store value in our collection
            cache.push(value);
        }
        return value;
    };
}


export function alert(...object) {
    if (object.length === 1) {
        console.log('Object:', object[0]);
        window.alert(JSON.stringify(object[0], circularReferencesReplacer(), 4));
    } else {
        console.log('Object:', object);
        window.alert(JSON.stringify(object, circularReferencesReplacer(), 4));
    }
}