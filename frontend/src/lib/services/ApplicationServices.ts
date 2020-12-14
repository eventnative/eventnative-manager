import {Project, User} from "./model";
import axios, {AxiosRequestConfig, AxiosResponse, AxiosTransformer, Method} from 'axios';
import {PostgresConfig} from "./destinations";
import * as uuid from 'uuid';
import AnalyticsService from "./analytics";
import {firebaseInit, FirebaseServerStorage, FirebaseUserService} from "./firebase";
import {message} from "antd";
import Marshal from "../commons/marshalling";
import {History} from "history";


type RoutingType = "hash" | "url";

export class ApplicationConfiguration {
    private readonly _firebaseConfig: any;
    private readonly _backendApiBase: string;
    private readonly _routerType: RoutingType = "hash";
    /**
     * One of the following: development, production
     */
    private readonly _appEnvironment: 'development' | 'production';

    constructor() {
        this._firebaseConfig = {
            apiKey: "AIzaSyDBm2HqvxleuJyD9xo8rh0vo1TQGp8Vohg",
            authDomain: "backbase.jitsu.com",
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
            this._backendApiBase = "https://app-api.jitsu.com/api/v1";
        }
        if (process.env.APP_ENV) {
            if (process.env.APP_ENV.toLowerCase() === 'production' || process.env.APP_ENV.toLowerCase() === 'development') {
                this._appEnvironment = 'production';
            } else {
                throw new Error(`Unknown app environment: ${process.env.APP_ENV.toLowerCase()}`)
            }
        } else {
            this._appEnvironment = 'development';
        }
        if (process.env.ROUTING_TYPE) {
            this._routerType = process.env.ROUTING_TYPE as RoutingType;
        }
        console.log(`App initialized. Backend: ${this._backendApiBase}. Env: ${this._appEnvironment}`);
    }


    get routerType(): "hash" | "url" {
        return this._routerType;
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
    private _history: History;
    private readonly _userService: UserService;
    private readonly _persistenceService: PersistenceServiceFacade;
    private readonly _backendApiClient: BackendApiClient;
    private readonly _applicationConfiguration: ApplicationConfiguration

    public onboardingNotCompleteErrorMessage = "Onboarding process hasn't been fully completed. Please, contact the support";
    private readonly _analyticsService: AnalyticsService;

    constructor() {
        this._applicationConfiguration = new ApplicationConfiguration();
        firebaseInit(this._applicationConfiguration.firebaseConfig)

        this._analyticsService = new AnalyticsService(this._applicationConfiguration);
        this._backendApiClient = new JWTBackendClient(this._applicationConfiguration.backendApiBase, () => this._userService.getUser().getCurrentToken(), this._analyticsService);
        this._userService = new FirebaseUserService(this._backendApiClient);
        this._persistenceService = new PersistenceServiceFacade(new FirebaseServerStorage());
    }

    /**
     * Navigates to a certain path. Depending on router config,
     * uses either /path or #/path
     * @param context react context
     * @param path (as /path/)
     */
    navigate(path: string) {
        if (path.length > 0 && path.charAt(0) === '#') {
            path = path.substr(1);
        }
        if (path.length > 0 && path.charAt(0) !== '/') {
            path = '/' + path;
        }
        if (path.length === 0) {
            path = '/';
        }
        if (this.applicationConfiguration.routerType === 'hash') {
            path = '#' + path;
        }

        this.history.push(path);
    }


    get history(): History {
        return this._history;
    }

    set history(value: History) {
        this._history = value;
    }

    get userService(): UserService {
        return this._userService;
    }

    get activeProject(): Project {
        return this.userService.getUser().projects[0];
    }

    get persistenceService(): PersistenceServiceFacade {
        return this._persistenceService;
    }

    get analyticsService(): AnalyticsService {
        return this._analyticsService;
    }

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
        await this.persistenceService.of(Object, "destinations").save(this.activeProject.id, {
            destinations: [Marshal.toPureJson(destinationConfig)]
        })
    }

    public async initializeDefaultApiKey() {
        await this._backendApiClient.post("/apikeys/default", {projectId: this.activeProject.id});
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


    get applicationConfiguration(): ApplicationConfiguration {
        return this._applicationConfiguration;
    }
}

export type UserLoginStatus = {
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

    becomeUser(email: string): Promise<void>;
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
        window['__enUIDebug'][field] = (typeof obj === 'object' && purify) ? Object.assign({}, obj) : obj;
    }
}

/**
 * Backend API client. Authorization is handled by implementation
 */
export interface BackendApiClient {
    /**
     * For end-points that returns JSON. In that case response will
     * be deserialized
     * @param url url
     * @param data data
     */
    post(url, data: any): Promise<any>

    /**
     * Same as post, but returns raw body
     */
    postRaw(url, data: any): Promise<string>

    getRaw(url): Promise<string>

    get(url): Promise<any>
}

class APIError extends Error {
    private _httpStatus: number;
    private _response: any;


    constructor(response: AxiosResponse, request: AxiosRequestConfig) {
        super(getErrorMessage(response, request));
        this._httpStatus = response.status;
        this._response = response.data;
    }
}

function getErrorMessage(response: AxiosResponse, request: AxiosRequestConfig): string {
    let errorResponse = parseErrorResponseBody(response);
    if (errorResponse && errorResponse.message) {
        return `${errorResponse.message} (#${response.status})`;
    } else {
        return `Error ${response.status} at ${request.url}`;
    }
}

function parseErrorResponseBody(response: AxiosResponse) {
    let strResponse = response.data.toString();
    if (response.data === null || response.data === undefined) {
        return null;
    }
    if (typeof response.data === 'object') {
        return response.data;
    }
    try {
        return response.data ? JSON.parse(response.data.toString()) : null;
    } catch (e) {
        return null;
    }

}

export interface Transformer<T> {
    (data: any, headers?: any): T;
}



const JSON_FORMAT: Transformer<any> = undefined;
const AS_IS_FORMAT: Transformer<string> = (response) => response ? response.toString() : null;

export class JWTBackendClient implements BackendApiClient {
    private tokenAccessor: () => string;
    private baseUrl: string;
    private analyticsService: AnalyticsService;


    constructor(baseUrl: string, tokenAccessor: () => string, analyticsService: AnalyticsService) {
        this.baseUrl = baseUrl;
        this.tokenAccessor = tokenAccessor;
        this.analyticsService = analyticsService;
    }

    private exec(method: Method, transform: AxiosTransformer, url: string, payload?: any): Promise<any> {
        let fullUrl = concatenateURLs(this.baseUrl, url);
        const token = this.tokenAccessor();
        let request: AxiosRequestConfig = {
            method: method,
            url: fullUrl,
            transformResponse: transform,
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
                    let error = new APIError(response, request);
                    this.handleApiError(request, response);
                    reject(error);
                }
            }).catch((error) => {
                if (error.response) {
                    this.handleApiError(request, error.response);
                    reject(new APIError(error.response, request));
                } else {
                    let baseMessage = "Request at " + fullUrl + " failed";
                    if (error.message) {
                        baseMessage += " with " + error.message;
                    }
                    this.analyticsService.onFailedAPI({
                        method: request.method,
                        url: request.url,
                        requestPayload: request.data,
                        responseStatus: -1,
                        errorMessage: baseMessage
                    });
                    reject(error);
                    reject(new Error(baseMessage));
                }
            });
        });
    }

    private handleApiError(request: AxiosRequestConfig, response: AxiosResponse<any>) {
        this.analyticsService.onFailedAPI({
            method: request.method,
            url: request.url,
            requestPayload: request.data,
            responseStatus: response.status,
            responseObject: response.data
        });
    }

    get(url: string): Promise<any> {
        return this.exec('get', JSON_FORMAT, url);
    }


    post(url: string, data: any): Promise<any> {
        return this.exec('post', JSON_FORMAT, url, data ? data : {});
    }

    postRaw(url, data: any): Promise<string> {
        return this.exec('post', AS_IS_FORMAT, url, data ? data : {});
    }

    getRaw(url): Promise<string> {
        return this.exec('get', AS_IS_FORMAT, url);
    }
}

function concatenateURLs(baseUrl: string, url: string) {
    let base = baseUrl.endsWith("/") ? baseUrl.substr(0, baseUrl.length - 1) : baseUrl;
    return base + (url.startsWith("/") ? url : ("/" + url));
}

/**
 * A generic object storage. Incapsulates putting object to storage and getting them back.
 *
 * Does not perform any marshalling / umarshalling. Should never be used directly. Use PersistenceServiceFacade
 */
export interface Persistence {
    /**
     * Returns an object by key. If key is not set, user id will be used as key
     */
    get(collectionName: string, key?: string): Promise<any>

    /**
     * Saves an object by key. If key is not set, user id will be used as key
     */
    save(collectionName: string, data: any, key?: string): Promise<void>
}


/**
 * Class that allows to save objects to storage and get them back. Handles serialization.
 *
 * Using a Persistence (see above) under the hood as underlying transfer
 */
export class PersistenceServiceFacade {
    private readonly storageService: Persistence


    constructor(storageService: Persistence) {
        this.storageService = storageService;
    }

    /**
     * Gets a storage for a particular object type.
     *
     * type can be:
     *      - Object - no serialization will be applied
     *      - class generated by protobufjs. In this case protobuf serialization will be applied
     *      - (DEPRECATED) Marshal in this case object will be stored using Marshal.toPureJson(), but pulled as is. It's up
     *      to client consumer
     * @param type
     * @param name
     */
    public of<T extends any>(type: any, name?: string): ObjectsPersistence<T> {
        if (type === Object) {
            if (!name) {
                throw new Error("For Object serialization collection name is required");
            }
            return new ObjectsPersistence<T>(
                name,
                this.storageService,
                (obj: any) => obj,
                (obj: T) => Marshal.toPureJson(obj, false)
            );
        }
        let typeName = this.validateType(type);
        return new ObjectsPersistence<T>(
            name ? name : typeName,
            this.storageService,
            (obj: any) => type.fromObject(obj),
            (obj: T) => type.toObject(obj)
        )

    }

    private validateType(type: any): string {
        if (!type) {
            throw new Error("type is null");
        }
        let className = type.prototype.constructor.name;

        if (!type.toObject) {
            throw new Error(`Type ${className} should be a protobuf generated class, ergo have toObject method`)
        }
        if (!type.fromObject) {
            throw new Error(`Type ${className} should be a protobuf generated class, ergo have fromObject method`)
        }
        return className;
    }
}

export class ObjectsPersistence<T> {
    private collectionName: string;
    private storageService: Persistence
    private deserializer: (any) => T
    private serializer: (T) => any


    constructor(collectionName: string, storageService: Persistence, deserializer: (any) => T, serializer: (T) => any) {
        this.collectionName = collectionName;
        this.storageService = storageService;
        this.deserializer = deserializer;
        this.serializer = serializer;
    }

    public async get(id: string): Promise<T> {
        let obj = await this.storageService.get(this.collectionName, id) || {};
        return this.deserializer(obj)
    }

    public async save(id: string, object: T): Promise<any> {
        return await this.storageService.save(this.collectionName, this.serializer(object), id)
    }

}