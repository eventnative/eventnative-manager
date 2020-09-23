import React, {ReactElement, ReactNode} from "react";
import LoginForm from "./lib/components/LoginForm/LoginForm";
import SignupForm from "./lib/components/SignupForm/SignupForm";
import {DestinationsList} from "./lib/components/DestinationsEditor/DestinationsList";
import ApiKeys from "./lib/components/ApiKeys/ApiKeys";

export class Page {
    componentFactory: () => ReactElement
    pageTitle: string
    path: string[]
    pageHeader: React.ReactNode;

    public getPrefixedPath(): string[] {
        return this.path.map(el => el.startsWith("/") ? el : "/" + el)
    }

    public getComponent(): ReactNode {
        let component: ReactElement = this.componentFactory();
        document.title = this.pageTitle;
        return component;
    }


    constructor(pageTitle: string, path: string[] | string, component: () => ReactElement, pageHeader?: ReactNode) {
        this.componentFactory = component;
        this.pageTitle = pageTitle;
        this.pageHeader = pageHeader;
        this.path = path instanceof Array ? path : [path];
    }

}

export const PUBLIC_PAGES: Page[] = [
    new Page("EventNative | login", ["/", "/dashboard", "/login"], () => (<LoginForm/>)),
    new Page("EventNative | register", ["/register"], () => (<SignupForm/>))
];

export const PRIVATE_PAGES: Page[] = [
    new Page("EventNative | edit destinations", "/destinations", () => (<DestinationsList />), "Edit destinations"),
    new Page("EventNative | edit API keys", "/api_keys", () => (<ApiKeys />), "API Keys")
];