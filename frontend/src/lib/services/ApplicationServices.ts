import * as firebase from 'firebase';
import {Project, SuggestedUserInfo, User} from "./model";
import {message} from "antd";
import {randomId} from "../commons/utils";

export default class ApplicationServices {
    private readonly _userServices: FirebaseUserServices;

    constructor() {

        const firebaseConfig = {
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "back1.eventnative.com",
            databaseURL: "https://tracker-285220.firebaseio.com",
            projectId: "tracker-285220",
            storageBucket: "tracker-285220.appspot.com",
            messagingSenderId: "942257799287",
            appId: "1:942257799287:web:e3b0bd3435f929d6a00672",
            measurementId: "G-6ZMG0NSJP8"
        };
        firebase.initializeApp(firebaseConfig);
        if (window) {
            window.firebase = firebase;
        }
        this._userServices = new FirebaseUserServices();
    }


    get userServices(): UserServices {
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

type UserLoginStatus = {
    user?: User
    loggedIn: boolean
    loginErrorMessage: string
}

export interface UserServices {
    /**
     * Logs in user. On success user must reload
     * @param email email
     * @param password password
     * @returns a promise
     */
    login(email: string, password: string): Promise<void>

    /**
     * Initiates google login. Returns Promise. On success user must reload
     * page.
     */
    initiateGoogleLogin(redirect?: string): Promise<void>

    /**
     * Initiates google login
     */
    initiateGithubLogin(redirect?: string)

    /**
     * Gets (waits for) logged in user (or null if user is not logged in)
     */
    waitForUser(): Promise<UserLoginStatus>;

    /**
     * Get current logged in user. Throws exception if user is not availavle
     */
    getUser(): User

    sendPasswordReset(email?: string);

    update(user: User);

    removeAuth(callback: () => void)

    createUser(email: string, password: string, name: string, company: string): Promise<void>;
}

class FirebaseUserServices implements UserServices {
    private user?: User
    private unregisterAuthObserver: firebase.Unsubscribe;

    initiateGithubLogin(redirect?: string) {
        return new Promise<void>(((resolve, reject) => {
            firebase.auth().signInWithPopup(new firebase.auth.GithubAuthProvider())
                .then((a) => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        }));
    }

    initiateGoogleLogin(redirect?: string): Promise<void> {
        return new Promise<void>(((resolve, reject) => {
            firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
                .then((a) => {
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        }));
    }

    login(email: string, password: string): Promise<any> {
        let fbLogin = firebase.auth().signInWithEmailAndPassword(email, password);
        return new Promise<any>((resolve, reject) => {
            fbLogin.then((login) => resolve(login)).catch((error) => reject(error));
        })
    }


    public waitForUser(): Promise<UserLoginStatus> {
        let fbUserPromise = new Promise<firebase.User>((resolve, reject) => {
            let unregister = firebase.auth().onAuthStateChanged((user: firebase.User) => {
                if (user) {
                    resolve(user)
                } else {
                    resolve(null)
                }
                unregister();
            }, error => {
                reject(error);
            })
        });
        return fbUserPromise.then((user: firebase.User) => {
            if (user != null) {
                return this.restoreUser(user).then((user) => {
                    return {user: user, loggedIn: true, loginErrorMessage: null}
                })
            } else {
                return {user: null, loggedIn: false, loginErrorMessage: null}
            }
        });
    }

    private static readonly USERS_COLLECTION = "users_info";

    private restoreUser(user: firebase.User): Promise<User> {
        return new Promise<User>((resolve, reject) => {
            if (user.email == null) {
                reject(new Error("User email is null"))
            }
            firebase.firestore().collection(FirebaseUserServices.USERS_COLLECTION).doc(user.email).get()
                .then((doc) => {
                    let suggestedInfo = this.suggestedInfoFromFirebaseUser(user);
                    if (doc.exists) {
                        resolve(this.user = new User(suggestedInfo, doc.data()));
                    } else {
                        resolve(this.user = new User(suggestedInfo));
                    }
                })
                .catch(reject)
        })
    }


    private suggestedInfoFromFirebaseUser(user: firebase.User): SuggestedUserInfo {
        return {
            email: user.email,
            name: user.displayName
        };
    }

    removeAuth(callback: () => void) {
        firebase.auth().signOut().then(callback).catch(callback);
    }

    getUser(): User {
        if (!this.user) {
            throw new Error("User is null")
        }
        return this.user;
    }

    update(user: User): Promise<void> {
        return new Promise<void>(((resolve, reject) => {
            if (user.projects == null) {
                reject(new Error(`Can't update user without projects:` + JSON.stringify(user)));
            }
            if (user.projects.length != 1) {
                reject(new Error(`Can't update user projects ( ` + user.projects.length + `), should be 1` + JSON.stringify(user)));
            }
            let userData: any = Object.assign({}, user)
            userData['_project'] = Object.assign({}, user.projects[0]);
            delete userData['_projects']
            console.log("Sending to FB", userData)
            return firebase.firestore().collection(FirebaseUserServices.USERS_COLLECTION).doc(user.email).set(userData, {merge: true}).then(resolve);
        }))
    }

    sendPasswordReset(email?: string): Promise<void> {
        return firebase.auth().sendPasswordResetEmail(email ? email : this.getUser().email);
    }

    createUser(email: string, password: string, name: string, company: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((user) => {
                    this.update(new User(this.suggestedInfoFromFirebaseUser(user.user), {
                        "_name": name,
                        "_project": new Project(randomId(), company)
                    })).then(resolve).catch(reject)
                })
                .catch(reject);
        })
    }
}
