import * as firebase from 'firebase';
import {rejects} from "assert";

export default class ApplicationServices {
    private _userService: FirebaseUserService;
    private _apiKeyService: FirebaseApiKeyService;

    constructor() {
        if (!firebase.apps.length) {
            firebase.initializeApp({
                projectId: "tracker-285220",
                apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
                authDomain: "dash.ksense.io",
                databaseURL: "https://dash.ksense.io",
                appId: "1:474493131:web:t1likquhg6j2hofw-EN-PROD",

                messagingSenderId: "942257799287",
                measurementId: "G-N568WS672N"
            });
        }

        if (window) {
            window.firebase = firebase;
        }
        this._userService = new FirebaseUserService();
        this._apiKeyService = new FirebaseApiKeyService();
    }


    get userService(): FirebaseUserService {
        return this._userService;
    }

    get apiKeyService(): FirebaseApiKeyService {
        return this._apiKeyService;
    }

    static _instance = null;

    static get(): ApplicationServices {
        if (ApplicationServices._instance == null) {
            ApplicationServices._instance = new ApplicationServices();
        }
        return ApplicationServices._instance;
    }


}

export interface UserService {
    /**
     * Logs in user
     * @param email email
     * @param password password
     * @returns a promise
     */
    login(email: string, password: string): Promise<any>

    /**
     * Initiates google login
     */
    initiateGoogleLogin(redirect?: string)

    /**
     * Initiates google login
     */
    initiateGithubLogin(redirect?: string)

    /**
     * Checks if user is logged in. Calls a callback when it's clear
     */
    checkLogin(callback: (hasLogin: boolean) => void);
}

class FirebaseUserService implements UserService{
    private unregisterAuthObserver: firebase.Unsubscribe;
    initiateGithubLogin(redirect?: string) {
    }

    initiateGoogleLogin(redirect?: string) {
    }

    login(email: string, password: string): Promise<any> {
        let fbLogin = firebase.auth().signInWithEmailAndPassword(email, password);
        return new Promise<any>((resolve, reject) => {
            fbLogin.then((login) => resolve(login)).catch((error) => reject(error));
        })
    }

    hasLogin(): boolean {
        return false;
    }

    checkLogin(callback: (hasLogin: boolean) => void) {
        this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
            (user: any) => {
                if (user) {
                    callback(true);
                } else {
                    callback(false);
                }
                this.unregisterAuthObserver();

            }
        );
    }

    removeAuth(callback: () => void) {
        firebase.auth().signOut().then(callback).catch(callback);
    }
}

export interface ApiKeyService {
    /**
     * Return api keys
     * @returns a promise
     */
    get(): Promise<any>

    /**
     * Save api keys
     */
    save(apiKeys: any)
}

class FirebaseApiKeyService implements ApiKeyService{
    get(): Promise<any> {
        let userId = firebase.auth().currentUser.uid
        return firebase.firestore().collection('en_auth').doc(userId).get()
    }

    save(apiKeys: any): Promise<any> {
        let userId = firebase.auth().currentUser.uid
        return firebase.firestore().collection('en_auth').doc(userId).set(apiKeys)
    }
}
