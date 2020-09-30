const _ = require('lodash');
/**
 * Helper classes to serialize things to JSON and back
 */

interface IMarshal {
    toPureJson(object: any);
    newInstance(object: any, json: any): any;
    newArrayInstance(object: any, json: any[]): any[];
}

const Marshal: IMarshal = {
    newArrayInstance(object: any, json: any[]): any[] {
        return json.map(item => this.newInstance(object, item));
    },

    newInstance: (cls: any, json: any) => {
        let instance = new cls;
        _.merge(instance, json);
        return instance;
    },

    toPureJson: (object: any) => {
        //not the best method, but works. TODO: make it better
        return JSON.parse(JSON.stringify(object));
    }

}

export default Marshal;