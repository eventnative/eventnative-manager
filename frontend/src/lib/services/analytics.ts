import {ApplicationConfiguration} from "./ApplicationServices";
import {User} from "./model";
import {H} from 'highlight.run'
import {eventN} from '@ksense/eventnative'
import LogRocket from 'logrocket';

const AnalyticsJS = require('./analyticsjs-wrapper.js').default;
import posthog from 'posthog-js';

export default class AnalyticsService {
    private appConfig: ApplicationConfiguration;
    private user: User;

    constructor(appConfig: ApplicationConfiguration) {
        this.appConfig = appConfig;

        eventN.init({
            key: "daaac3a7-a7e4-475f-80dd-43a2985680c5",
            tracking_host: "https://t.jitsu.com"
        });
    }

    public onUserKnown(user: User) {
        if (!user || this.appConfig.appEnvironment === 'development') {
            return;
        }
        LogRocket.init('6gfkmj/ksense');
        H.init(33);
        posthog.init('72gPORhrnFw9os9uBF_IHSEohx9fObmIAyFyhHq_1mA', {api_host: 'https://ph-ksense.herokuapp.com'});
        this.user = user;
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

    public onError(error: any) {
        if (this.appConfig.appEnvironment === 'development') {
            return
        }
    }
}

declare global {
    interface Window {
        analytics: any;
    }
}

