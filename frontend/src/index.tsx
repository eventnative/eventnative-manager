import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, HashRouter, Route} from 'react-router-dom';
import App from "./App";
import ApplicationServices from "./lib/services/ApplicationServices";

let cfg = ApplicationServices.get().applicationConfiguration;
if (cfg.routerType === "url" && window.location.pathname === '/' && window.location.hash.length > 0) {
    let hash = window.location.hash.substr(1);
    window.location.replace(hash);
}


let root = React.createElement(
    cfg.routerType === "hash" ? HashRouter : BrowserRouter,
    {}, <Route render={(props) => {
        return <App location={props.location.pathname}/>
    } } />
);
ReactDOM.render(
    root,
    document.getElementById('root')
);
