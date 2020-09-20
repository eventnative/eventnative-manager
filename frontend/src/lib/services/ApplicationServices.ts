import * as firebase from 'firebase';

export default class ApplicationServices {
    private readonly _firebase: any;

    constructor() {
        firebase.initializeApp({
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "dash.ksense.io",
            databaseURL: "https://dash.ksense.io",
            appId: "1:474493131:web:t1likquhg6j2hofw-EN-PROD",
        });
        this._firebase = firebase;
        if (window) {
            window.firebase = firebase;
        }
    }


    get firebase(): any {
        return this._firebase;
    }

    static _instance = null;

    static get(): ApplicationServices {
        if (ApplicationServices._instance == null) {
            ApplicationServices._instance = new ApplicationServices();
        }
        return ApplicationServices._instance;
    }
}
