import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter} from 'react-router-dom';
import App from './App.tsx';
import {Auth0Provider} from "@auth0/auth0-react";

ReactDOM.render(
    <HashRouter>
        <App/>
    </HashRouter>,
    document.getElementById('reactApplicationRoot')
);
