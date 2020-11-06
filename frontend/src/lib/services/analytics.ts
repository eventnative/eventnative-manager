import {ApplicationConfiguration} from "./ApplicationServices";
import {User} from "./model";
import {H} from 'highlight.run'
import {eventN} from '@ksense/eventnative'
import LogRocket from 'logrocket';

const AnalyticsJS = require('./analyticsjs-wrapper.js').default;
import posthog from 'posthog-js';
import {isNullOrUndef} from "../commons/utils";


type ConsoleMessageListener = (level: string, ...args) => void;

class ConsoleLogInterceptor {
    private initialized: boolean = false;
    private listeners: ConsoleMessageListener[] = [];
    private originalError: (message?: any, ...optionalParams: any[]) => void;

    public addListener(listener: ConsoleMessageListener) {
        this.listeners.push(listener);
    }

    public init() {
        if (this.initialized) {
            return;
        }
        let interceptor = this;

        (function () {
            interceptor.originalError = console.error;
            console.error = function () {
                interceptor.listeners.forEach((listener: ConsoleMessageListener) => {
                    try {
                        listener('error', arguments);
                    } catch (e) {
                        console.warn("Error applying error listener",)
                    }
                })
                interceptor.originalError.apply(this, Array.prototype.slice.call(arguments));
            };
        }());
    }

    public error(message?: any, ...optionalParams: any[]) {
        this.originalError.apply(this, Array.prototype.slice.call(arguments));
    }

}


type ApiErrorInfo = {
    method: string
    url: string
    requestPayload: any,
    responseStatus: number
    responseObject?: any
    errorMessage?: string
};

class ApiErrorWrapper extends Error {
    private apiDetails: ApiErrorInfo;

    constructor(message: string, apiDetails: ApiErrorInfo) {
        super(message);
        this.apiDetails = apiDetails;
    }
}

function findError(args: any): Error {
    if (typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean') {
        return null;
    }
    args = Array.prototype.slice.call(args);
    for (let i = 0; i < args.length; i++) {
        let arg = args[i]
        if (isError(arg)) {
            return arg;
        } else if (Array.isArray(Array.prototype.slice.call(arg))) {
            let error = findError(arg);
            if (error) {
                return error;
            }
        }
    }
    return null;
}

function isError(obj: any) {
    if (isNullOrUndef(obj)) {
        return false;
    }
    return obj instanceof Error || obj.constructor.name === 'Error' || (obj.message !== undefined && obj.stack !== undefined);
}

export default class AnalyticsService {
    private globalErrorListenerPresent: boolean = false;
    private appConfig: ApplicationConfiguration;
    private user: User;
    private logRocketInitialized: boolean = false;
    private consoleInterceptor: ConsoleLogInterceptor = new ConsoleLogInterceptor()

    constructor(appConfig: ApplicationConfiguration) {
        this.appConfig = appConfig;
        this.consoleInterceptor.init();

        eventN.init({
            key: "daaac3a7-a7e4-475f-80dd-43a2985680c5",
            tracking_host: "https://t.jitsu.com"
        });
        this.setupGlobalErrorHandler();
        this.consoleInterceptor.addListener((level, ...args) => {
            let error = findError(args);
            if (error) {
                this.onGlobalError(error, true)
            }
        })
    }

    public ensureLogRocketInitialized() {
        if (!this.logRocketInitialized && !this.isDev()) {
            LogRocket.init('6gfkmj/ksense');
            this.logRocketInitialized = true;
        }
    }

    public userHasDomain(email: string, domains: string[]) {
        return domains.find(domain => email.indexOf("@" + domain) > 0) !== undefined;
    }

    public onUserKnown(user: User) {
        if (!user || this.isDev() || this.userHasDomain(user.email, ["ksense.io", "jitsu.com", "ksense.ai"])) {
            return;
        }
        H.init(33);
        posthog.init('72gPORhrnFw9os9uBF_IHSEohx9fObmIAyFyhHq_1mA', {api_host: 'https://ph-ksense.herokuapp.com'});
        this.user = user;
        this.ensureLogRocketInitialized();
        LogRocket.identify(user.uid, {
            email: user.email,
        });
        H.identify(user.email, {id: user.uid})
        AnalyticsJS.init("jEB5Eas68Pz2zmwNIm2QSlxFE7PGsndX");
        AnalyticsJS.get().identify(user.uid, {
            email: user.email
        })
        eventN.id({
            "email": user.email,
            "internal_id": user.uid
        });
        posthog.people.set({email: user.email});
        posthog.identify(user.uid);
    }

    private isDev() {
        return this.appConfig.appEnvironment === 'development';
    }

    public onPageLoad({pagePath}: { pagePath: string }) {
        if (this.appConfig.appEnvironment === 'development') {
            return
        }
        eventN.track('app_page', {
            path: pagePath,
            app: "hosted_ui"
        })

        if (this.user) {
            AnalyticsJS.get().page('app_page', pagePath, {
                app: "hosted_ui"
            });
            posthog.capture('$pageview');
        }
    }

    public onGlobalError(error: Error, doNotLog?: boolean) {
        if (!doNotLog) {
            //call console log through interceptor, to make sure it won't be handled
            this.consoleInterceptor.error("[Jitsu] uncaught error", error)
        }
        if (!this.isDev()) {
            try {
                this.ensureLogRocketInitialized();
                LogRocket.captureException(error);
            } catch (e) {
                console.warn("Failed to send event to error monitoring", e)
            }
        }
    }

    public onGlobalErrorEvent(event: ErrorEvent) {
        this.consoleInterceptor.error(`[Jitsu] uncaught error '${event.message || 'unknown'}' at ${event.filename}:${event.lineno}:${event.colno}`, event.error)
        if (!this.isDev()) {
            try {
                this.ensureLogRocketInitialized();
                LogRocket.captureException(event.error);
            } catch (e) {
                console.warn("Failed to send event to error monitoring", e)
            }
        }
    }


    setupGlobalErrorHandler() {
        if (!this.globalErrorListenerPresent) {
            window.addEventListener('error', (event) => this.onGlobalErrorEvent(event));
            window.addEventListener("unhandledrejection", (event) => {
                this.onGlobalError(new Error("Unhandled rejection: " + event.reason))
            });
            this.globalErrorListenerPresent = true;
        }
    }

    onFailedAPI(param: ApiErrorInfo) {
        let message = `[Jitsu] ${param.method.toUpperCase()} ${param.url} failed with ${param.responseStatus}`;
        this.consoleInterceptor.error(message);
        if (!this.isDev()) {
            LogRocket.captureException(new ApiErrorWrapper(message, param))
        }
    }
}

declare global {
    interface Window {
        analytics: any;
    }
}

