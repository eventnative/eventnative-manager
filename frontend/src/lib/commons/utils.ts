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

/**
 * Enhanced alert. Displays JSON representation of the
 * object and logs a copy to console
 */
export function alert(...object) {
    if (object.length === 1) {
        console.log('Object:', object[0]);
        window.alert(JSON.stringify(object[0], circularReferencesReplacer(), 4));
    } else {
        console.log('Object:', object);
        window.alert(JSON.stringify(object, circularReferencesReplacer(), 4));
    }
}

/**
 * Navigates to a page and reloads it (if URL is prefixed by hash). Url is relative
 */
export function navigateAndReload(url) {
    if (url.startsWith("#")) {
        window.location.hash = url;
        //window.location.reload()
    }

}
