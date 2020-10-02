import * as firebase from 'firebase';
import {Project, SuggestedUserInfo, User} from "./model";
import {randomId} from "../commons/utils";
import Marshal from "../commons/marshalling";
import axios from 'axios';
import {PostgresConfig} from "./destinations";
import * as uuid from 'uuid';
import {message} from "antd";

export class ApplicationConfiguration {
    private readonly _firebaseConfig: any;
    private readonly _backendApiBase: string;

    constructor() {
        this._firebaseConfig = {
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "back1.eventnative.com",
            databaseURL: "https://tracker-285220.firebaseio.com",
            projectId: "tracker-285220",
            storageBucket: "tracker-285220.appspot.com",
            messagingSenderId: "942257799287",
            appId: "1:942257799287:web:e3b0bd3435f929d6a00672",
            measurementId: "G-6ZMG0NSJP8"
        };
        if (process.env.BACKEND_API_BASE) {
            this._backendApiBase = process.env.BACKEND_API_BASE;
        } else {
            this._backendApiBase = window.location.protocol + "//" + window.location.hostname + (window.location.port.length > 0 ? (":" + window.location.port) : "") + "/api/";
        }
    }


    get firebaseConfig(): any {
        return this._firebaseConfig;
    }

    get backendApiBase(): string {
        return this._backendApiBase;
    }
}

export default class ApplicationServices {
    private readonly _userService: UserService;
    private readonly _storageService: FirebaseServerStorage;
    private _backendApiClient: BackendApiClient;
    private _applicationConfiguration: ApplicationConfiguration

    public onboardingNotCompleteErrorMessage = "Onboarding process hasn't been fully completed. Please, contact the support";

    constructor() {
        this._applicationConfiguration = new ApplicationConfiguration();
        firebase.initializeApp(this._applicationConfiguration.firebaseConfig);
        if (window) {
            window.firebase = firebase;
        }
        this._userService = new FirebaseUserService();
        this._storageService = new FirebaseServerStorage();
        this._backendApiClient = new JWTBackendClient(this._applicationConfiguration.backendApiBase, () => this._userService.getUser().authToken);
    }

    get userService(): UserService {
        return this._userService;
    }

    get activeProject(): Project {
        return this.userService.getUser().projects[0];
    }

    get storageService(): ServerStorage {
        return this._storageService;
    }

    static _instance = null;

    static get(): ApplicationServices {
        if (ApplicationServices._instance == null) {
            ApplicationServices._instance = new ApplicationServices();
        }
        return ApplicationServices._instance;
    }


    get backendApiClient(): BackendApiClient {
        return this._backendApiClient;
    }

    public initializeDefaultDestination(): void {
        this._backendApiClient.post("/database", {}).then(result => {
            console.log("ruak started initialization")
            const destinationConfig = new PostgresConfig("default_destination");
            this.storageService.save("api_keys", {tokens: [this.generateToken()]})
                .then(() => console.log("ruak saved token")).catch(() => message.error(this.onboardingNotCompleteErrorMessage))
            destinationConfig.update(result)
            this._storageService.save("destinations", {destinations: [destinationConfig]}, this.activeProject.id)
                .then(() => console.log("ruak saved destination")).catch(() => message.error(this.onboardingNotCompleteErrorMessage))
        }).catch(() => {
            console.log(this.onboardingNotCompleteErrorMessage)
            message.error(this.onboardingNotCompleteErrorMessage)
        })
    }

    generateToken(): any {
        return {
            token: {
                auth: uuid.v4(),
                s2s_auth: uuid.v4(),
                origins: []
            }
        }
    }
}

type UserLoginStatus = {
    user?: User
    loggedIn: boolean
    loginErrorMessage: string
}

export interface UserService {
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

/**
 * Sets debug info that is available as __enUIDebug in dev console. So far
 * sets the field in any case, later it will be possible to do in only in dev mode
 * @param field
 * @param obj
 */
export function setDebugInfo(field: string, obj: any) {
    if (window) {
        if (!window['__enUIDebug']) {
            window['__enUIDebug'] = {}
        }
        window['__enUIDebug'][field] = Object.assign({}, obj);
    }
}

class FirebaseUserService implements UserService {
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
            firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).get()
                .then((doc) => {
                    user.getIdToken(false).then((token) => {
                        let suggestedInfo = this.suggestedInfoFromFirebaseUser(user);
                        if (doc.exists) {
                            resolve(this.user = new User(user.uid, token, suggestedInfo, doc.data()));
                        } else {
                            resolve(this.user = new User(user.uid, token, suggestedInfo));
                        }
                    }).catch(reject);
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
            return firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).set(userData, {merge: true}).then(resolve);
        }))
    }

    sendPasswordReset(email?: string): Promise<void> {
        return firebase.auth().sendPasswordResetEmail(email ? email : this.getUser().email);
    }

    createUser(email: string, password: string, name: string, company: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((user) => {
                    user.user.getIdToken(false).then((token) => {
                        this.update(new User(user.user.uid, token, this.suggestedInfoFromFirebaseUser(user.user), {
                            "_name": name,
                            "_project": new Project(randomId(), company)
                        })).then(resolve).catch(reject)
                    }).catch(reject)
                })
                .catch(reject);
        })
    }
}


/**
 * Backend API client. Authorization is handled by implementation
 */
export interface BackendApiClient {
    post(url, data: any): Promise<any>

    get(url): Promise<any>
}

export class JWTBackendClient implements BackendApiClient {
    private tokenAccessor: () => string;
    private baseUrl: string;


    constructor(baseUrl: string, tokenAccessor: () => string) {
        this.baseUrl = baseUrl;
        this.tokenAccessor = tokenAccessor;
    }

    get(url: string): Promise<any> {
        return axios.get(this.fullUrl(url), {
            headers: {
                "X-Client-Auth": this.tokenAccessor()
            }
        });
    }

    private fullUrl(url) {
        return this.baseUrl + url;
    }

    post(url: string, data: any): Promise<any> {
        const token = this.tokenAccessor();
        console.log("ruak token: " + token)
        return axios.post(this.fullUrl(url), {}, {
            headers: {
                "X-Client-Auth": token
            }
        })
    }

}

/**
 * A generic object storage
 */
export interface ServerStorage {
    /**
     * Returns an object by key. If key is not set, user id will be used as key
     */
    get(collectionName: string, key?: string): Promise<any>

    /**
     * Saves an object by key. If key is not set, user id will be used as key
     */
    save(collectionName: string, data: any, key?: string): Promise<void>
}


class FirebaseServerStorage implements ServerStorage {


    get(collectionName: string, key?: string): Promise<any> {
        if (!key) {
            key = firebase.auth().currentUser.uid;
        }
        return firebase.firestore().collection(collectionName).doc(key).get().then((doc) => doc.data())
    }

    save(collectionName: string, data: any, key?: string): Promise<void> {
        if (!key) {
            key = firebase.auth().currentUser.uid;
        }
        console.log("Saving to storage: " + key + " = ", data)
        return firebase.firestore().collection(collectionName).doc(key).set(Marshal.toPureJson(data))
    }
}