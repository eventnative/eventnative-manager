import * as firebase from 'firebase';
import {rejects} from "assert";

export default class ApplicationServices {
    private _userServices: FirebaseUserServices;

    constructor() {
        firebase.initializeApp({
            projectId: "tracker-285220",
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "dash.ksense.io",
            databaseURL: "https://dash.ksense.io",
            appId: "1:474493131:web:t1likquhg6j2hofw-EN-PROD",
        });
        if (window) {
            window.firebase = firebase;
        }
        this._userServices = new FirebaseUserServices();
    }


    get userServices(): FirebaseUserServices {
        return this._userServices;
    }

    static _instance = null;

    static get(): ApplicationServices {
        if (ApplicationServices._instance == null) {
            ApplicationServices._instance = new ApplicationServices();
        }
        return ApplicationServices._instance;
    }


}

export interface UserServices {
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

class FirebaseUserServices implements UserServices{
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
