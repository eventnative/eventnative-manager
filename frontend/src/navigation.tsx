import React, {ReactNode} from "react";
import LoginForm from "./lib/components/LoginForm/LoginForm";
import SignupForm from "./lib/components/SignupForm/SignupForm";

export type Route = {
    component: ReactNode,
    pageTitle: string,
    path: string | string[]
}

export const PUBLIC_PAGES: Route[] = [
    {pageTitle: "EventNative | login", component: (<LoginForm/>), path: ["/", "/dashboard"]},
    {pageTitle: "EventNative | register", component: (<SignupForm/>), path: ["/register"]}
];

export const PRIVATE_PAGES: Route[] = [
    {pageTitle: "EventNative | login", component: (<LoginForm/>), path: ["/", "/dashboard"]},
    {pageTitle: "EventNative | register", component: (<SignupForm/>), path: ["/register"]}
];