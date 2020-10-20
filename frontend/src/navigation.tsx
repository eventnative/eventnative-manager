import React, {ReactElement, ReactNode} from "react";
import {DestinationsList} from "./lib/components/DestinationsEditor/DestinationsList";
import ApiKeys from "./lib/components/ApiKeys/ApiKeys";
import {CustomDomains} from "./lib/components/CustomDomains/CustomDomains";
import {CenteredSpin} from "./lib/components/components";
import ComponentTest from "./lib/components/componentTest";
import SignupForm from "./lib/components/SignupForm/SignupForm";
import LoginForm from "./lib/components/LoginForm/LoginForm";
import StatusPage from "./lib/components/StatusPage/StatusPage";
import {DownloadConfig} from "./lib/components/DownloadConfig/DownloadConfig";


export class Page {
    componentFactory: (params: Record<any, string>) => ReactElement
    pageTitle: string
    path: string[]
    pageHeader: React.ReactNode;

    public getPrefixedPath(): string[] {
        return this.path.map(el => el.startsWith("/") ? el : "/" + el)
    }

    get id() {
        let firstPath = this.path.find(p => p && p.length > 0);
        if (!firstPath) {
            firstPath = "root";
        }
        return firstPath.replace("/", '');
    }

    public getComponent(params: Record<any, string>): ReactNode {
        return this.componentFactory(params);
    }


    constructor(pageTitle: string, path: string[] | string, component: (params: Record<any, string>) => ReactElement, pageHeader?: ReactNode) {
        this.componentFactory = component;
        this.pageTitle = pageTitle;
        this.pageHeader = pageHeader;
        this.path = path instanceof Array ? path : [path];
    }
}

function lazyPageFactory(importF): (params: Record<any, string>) => ReactElement {
    return (params: Record<any, string>) => {
        let LazyComponent = React.lazy(importF);
        return <React.Suspense fallback={<CenteredSpin />}>
            <LazyComponent {...params} />
        </React.Suspense>
    }
}

export const PUBLIC_PAGES: Page[] = [
    new Page("EventNative | login", ["/", "/dashboard", "/login"], () => (<LoginForm/>)),
    new Page("EventNative | register", ["/register"], () => (<SignupForm/>))
];

export const PRIVATE_PAGES: Page[] = [
    new Page("Test Component", "/test", () => (<ComponentTest />), "Component Test"),
    new Page("EventNative | dashboard", ["/dashboard", ""], () => (<StatusPage />), "Status"),
    new Page("EventNative | edit destinations", "/destinations", () => (<DestinationsList />), "Edit destinations"),
    new Page("EventNative | download config", "/cfg_download", () => (<DownloadConfig />), "Download EventNative configuration"),
    new Page("EventNative | edit API keys", "/api_keys", () => (<ApiKeys />), "API Keys"),
    new Page("EventNative | edit custom domains", "/domains", () => (<CustomDomains />), "Custom domains")
];