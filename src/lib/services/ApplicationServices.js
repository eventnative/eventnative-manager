import * as firebase from 'firebase';

export default class ApplicationServices {

    constructor() {
        firebase.initializeApp({
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "tracker-285220.firebaseapp.com",
            databaseURL: "https://tracker-285220.firebaseio.com",
            projectId: "tracker-285220",
            storageBucket: "tracker-285220.appspot.com",
            messagingSenderId: "942257799287",
            appId: "1:942257799287:web:744ae9db9e981189a00672",
            measurementId: "G-N568WS672N"
        });
        this._firebase = firebase;
        if (window) {
            window.firebase = firebase;
        }
    }

    firebase() {
        return this._firebase;
    }

    static _instance = null;

    static get() {
        if (ApplicationServices._instance == null) {
            ApplicationServices._instance = new ApplicationServices();
        }
        return ApplicationServices._instance;
    }
}

class Storage {
    async get(collection, id) {

    }
}