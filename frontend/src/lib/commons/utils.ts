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

/**
 * Fully reloads current page
 */
export function reloadPage() {
    location.reload();
}

export function randomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 *
 */
export class IndexedList<T> {
    private readonly indexF: (T) => string
    private index: Record<string, number>
    private list: T[];

    constructor(indexF: (T) => string);
    constructor(indexF: (T) => string, ...items: T[]) {
        this.indexF = indexF;
        this.index = {}
        this.list = [];
        items.forEach((item) => this.pushSingle(item));
    }

    public toArray(): T[] {
        return this.list;
    }

    public pushSingle(item: T): void {
        let key = this.indexF(item);
        if (this.index[key] !== undefined) {
            throw new Error("Duplicate key " + key);
        }
        this.list.push(item);
        this.index[key] = this.list.length - 1
    }

    public push(...items: T[]): IndexedList<T> {
        items.forEach((item) => this.pushSingle(item));
        return this;
    }

    public remove(key: string): T {
        let index = this.index[key];
        if (index === undefined) {
            return undefined;
        } else {
            delete this.index[key]
            let result = this.list[index];
            this.list = this.list.filter((item, i) => i != index);
            return result;
        }
    }
    public addOrUpdate(item: T): IndexedList<T> {
        let existingIndex = this.index[this.indexF(item)];
        if (existingIndex === undefined) {
            this.push(item);
        } else {
            this.list[existingIndex] = item;
        }
        return this;
    }

}
