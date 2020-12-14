import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, HashRouter, Route, Router} from 'react-router-dom';
import App from "./App";
import ApplicationServices from "./lib/services/ApplicationServices";

import { createBrowserHistory } from 'history';
let history = createBrowserHistory();
let cfg = ApplicationServices.get().applicationConfiguration;
ApplicationServices.get().history = history;
if (cfg.routerType === "url" && window.location.pathname === '/' && window.location.hash.length > 0) {
    let hash = window.location.hash.substr(1);
    window.location.replace(hash);
}


let root = React.createElement(
    Router,
    {history: history} as any,
    <Route render={(props) => {
        return <App location={props.location.pathname}/>
    } } />
);
ReactDOM.render(
    root,
    document.getElementById('root')
);
