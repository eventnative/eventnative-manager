import * as firebase from 'firebase';
import {Project, SuggestedUserInfo, User} from "./model";
import {randomId} from "../commons/utils";
import Marshal from "../commons/marshalling";
import axios, {AxiosRequestConfig, AxiosResponse, Method} from 'axios';
import {PostgresConfig} from "./destinations";
import * as uuid from 'uuid';
import AnalyticsService from "./analytics";


export class ApplicationConfiguration {
    private readonly _firebaseConfig: any;
    private readonly _backendApiBase: string;
    /**
     * One of the following: dev, prod
     */
    private readonly _appEnvironment;

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
            this._backendApiBase = concatenateURLs(process.env.BACKEND_API_BASE, "/api/v1");
        } else {
            this._backendApiBase = window.location.protocol + "//" + window.location.hostname + (window.location.port.length > 0 ? (":" + window.location.port) : "") + "/api/v1";
        }
        if (process.env.APP_ENV) {
            this._appEnvironment = process.env.APP_ENV.toLowerCase();
        } else {
            this._appEnvironment = 'dev';
        }
        console.log(`App initialized. Backend: ${this._backendApiBase}. Env: ${this._appEnvironment}`);
    }


    get firebaseConfig(): any {
        return this._firebaseConfig;
    }


    get appEnvironment() {
        return this._appEnvironment;
    }

    get backendApiBase(): string {
        return this._backendApiBase;
    }

}

export default class ApplicationServices {
    private readonly _userService: UserService;
    private readonly _storageService: FirebaseServerStorage;
    private readonly _backendApiClient: BackendApiClient;
    private readonly _applicationConfiguration: ApplicationConfiguration

    public onboardingNotCompleteErrorMessage = "Onboarding process hasn't been fully completed. Please, contact the support";
    private readonly _analyticsService: AnalyticsService;

    constructor() {
        this._applicationConfiguration = new ApplicationConfiguration();
        firebase.initializeApp(this._applicationConfiguration.firebaseConfig);
        if (window) {
            window.firebase = firebase;
        }
        this._userService = new FirebaseUserService();
        this._storageService = new FirebaseServerStorage();
        this._backendApiClient = new JWTBackendClient(this._applicationConfiguration.backendApiBase, () => this._userService.getUser().authToken);
        this._analyticsService = new AnalyticsService(this._applicationConfiguration);
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

    get analyticsService(): AnalyticsService {
        return this._analyticsService;
    }

    static _instance = null;

    static get(): ApplicationServices {
        if (window['_en_instance'] === undefined) {
            try {
                window['_en_instance'] = new ApplicationServices();
            } catch (e) {
                console.error("Failed to initialize application services", e);
                document.body.innerHTML = `<pre>Fatal error '${e.message}': \n${e.stack}</pre>`
                if (window.stop) {
                    window.stop();
                }
                throw e;
            }
        }
        return window['_en_instance'];
    }


    get backendApiClient(): BackendApiClient {
        return this._backendApiClient;
    }

    public async initializeDefaultDestination() {
        let db = await this._backendApiClient.post("/database", {projectId: this.activeProject.id});
        const destinationConfig = new PostgresConfig("test_destination");
        destinationConfig.comment = "We set up a test postgres database for you. It's hosted by us and has a 10,000 rows limitation. It's ok" +
            " to try with service with it. However, don't use it in production setup. To reveal credentials, click on the 'Edit' button"
        let data = {}
        destinationConfig.fillInitialValues(data);

        destinationConfig.update({
            ...data,
            pguser: db['User'],
            pgpassword: db['Password'],
            pghost: db['Host'],
            pgport: db['Port'],
            pgdatabase: db['Database'],
            mode: "stream"
        });
        await this._storageService.save("destinations", {destinations: [destinationConfig]}, this.activeProject.id);
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
     * Get (wait for) logged in user (or null if user is not logged in).
     */
    waitForUser(): Promise<UserLoginStatus>;

    /**
     * Get current logged in user. Throws exception if user is not availavle
     */
    getUser(): User

    /**
     * Get current logged in user. Throws exception if user is not availavle
     */
    hasUser(): boolean

    sendPasswordReset(email?: string);

    update(user: User);

    removeAuth(callback: () => void)

    createUser(email: string, password: string): Promise<void>;

    changePassword(value: any): void;
}

/**
 * Sets debug info that is available as __enUIDebug in dev console. So far
 * sets the field in any case, later it will be possible to do in only in dev mode
 * @param field
 * @param obj
 */
export function setDebugInfo(field: string, obj: any, purify = true) {
    if (window) {
        if (!window['__enUIDebug']) {
            window['__enUIDebug'] = {}
        }
        window['__enUIDebug'][field] = purify ? Object.assign({}, obj) : obj;
    }
}

class FirebaseUserService implements UserService {
    private user?: User
    private unregisterAuthObserver: firebase.Unsubscribe;
    private firebaseUser: firebase.User;

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
                    this.firebaseUser = user;
                    setDebugInfo('firebaseUser', user);
                    setDebugInfo('updateEmail', async (email) => {
                        try {
                            let updateResult = await user.updateEmail(email);
                            console.log(`Attempt to update email to ${email}. Result`, updateResult)
                        } catch (e) {
                            console.log(`Attempt to update email to ${email} failed`, e)
                        }
                    }, false)
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

    private async restoreUser(user: firebase.User): Promise<User> {

        let userInfo = await firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).get();
        let userToken = await user.getIdToken(false);
        let suggestedInfo = {
            email: user.email,
            name: user.displayName,
        };
        if (userInfo.exists) {
            return this.user = new User(user.uid, userToken, suggestedInfo, userInfo.data());
        } else {
            return this.user = new User(user.uid, userToken, suggestedInfo)
        }
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
            let userData: any = Marshal.toPureJson(user)
            userData['_project'] = Marshal.toPureJson(user.projects[0]);
            delete userData['_projects']
            return firebase.firestore().collection(FirebaseUserService.USERS_COLLECTION).doc(user.uid).set(userData, {merge: true}).then(resolve);
        }))
    }

    sendPasswordReset(email?: string): Promise<void> {
        return firebase.auth().sendPasswordResetEmail(email ? email : this.getUser().email);
    }

    async createUser(email: string, password: string): Promise<void> {
        let firebaseUser = await firebase.auth().createUserWithEmailAndPassword(email.trim(), password.trim());
        let token = await firebaseUser.user.getIdToken(false);
        let user = new User(firebaseUser.user.uid, token, {name: null, email: email}, {
            "_name": name,
            "_project": new Project(randomId(), null)
        });
        await this.update(user);
    }

    hasUser(): boolean {
        return !!this.user;
    }

    changePassword(newPassword: any): Promise<void> {
        return this.firebaseUser.updatePassword(newPassword)
    }


}


/**
 * Backend API client. Authorization is handled by implementation
 */
export interface BackendApiClient {
    post(url, data: any): Promise<any>

    get(url): Promise<any>
}

class APIError extends Error {
    private _httpStatus: number;
    private _response: any;


    constructor(response: AxiosResponse, request: AxiosRequestConfig) {
        super(response.data['message'] === undefined ? `Error ${response.status} at ${request.url}` : response.data['message']);
        this._httpStatus = response.status;
        this._response = response.data;
    }
}

export class JWTBackendClient implements BackendApiClient {
    private tokenAccessor: () => string;
    private baseUrl: string;


    constructor(baseUrl: string, tokenAccessor: () => string) {
        this.baseUrl = baseUrl;
        this.tokenAccessor = tokenAccessor;
    }

    private exec(method: Method, url: string, payload?: any): Promise<any> {
        let fullUrl = concatenateURLs(this.baseUrl, url);
        const token = this.tokenAccessor();
        let request: AxiosRequestConfig = {
            method: method,
            url: fullUrl,
            headers: {
                "X-Client-Auth": token
            }
        };
        if (payload !== undefined) {
            if (method.toLowerCase() === 'get') {
                throw new Error(`GET ${fullUrl} can't have a body`);
            }
            request.data = payload;
        }
        return new Promise<any>((resolve, reject) => {
            axios(request).then((response: AxiosResponse<any>) => {
                if (response.status == 200) {
                    resolve(response.data);
                } else if (response.status == 204) {
                    resolve({});
                } else {
                    reject(new APIError(response, request));
                }
            }).catch((error) => {
                if (error.response) {
                    reject(new APIError(error.response, request));
                } else {
                    let baseMessage = "Request at " + fullUrl + " failed";
                    if (error.message) {
                        baseMessage += " with " + error.message;
                    }
                    reject(new Error(baseMessage));
                }
            });
        });
    }

    get(url: string): Promise<any> {
        return this.exec('get', url);
    }


    post(url: string, data: any): Promise<any> {
        return this.exec('post', url, data ? data : {});
    }
}

function concatenateURLs(baseUrl: string, url: string) {
    let base = baseUrl.endsWith("/") ? baseUrl.substr(0, baseUrl.length - 1) : baseUrl;
    return base + (url.startsWith("/") ? url : ("/" + url));
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
        let pureJson = Marshal.toPureJson(data);
        pureJson['_lastUpdated'] = new Date().toISOString();
        console.log("Saving to storage: " + key + " = ", pureJson)
        return firebase.firestore().collection(collectionName).doc(key).set(pureJson)
    }
}