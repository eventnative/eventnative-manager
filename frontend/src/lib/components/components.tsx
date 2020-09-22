/**
 * Library of small components that are usefull for different purposes 
 */

import React from "react";
const loader = require("../../icons/loading.gif");
const plumber = require("../../icons/plumber.png");
import './components.less'
import Icon from "antd/es/icon";
/**
 * Loader component. A spinner and text positioned in the center of parent component, assuming
 * parent's component display = block
 */
export function Preloader(props) {
    let text = props.text ? props.text : "Loading application, please be patient!"
    return (<div style={{}} className="preloader-wrapper">
        <img src={loader} alt="[loading]" className="preloader-image" />
        <div className="preloader-text">
            {text}
        </div>
    </div>);
}

const DEFAULT_ERROR_TEXT = (<p>The application has crashed :( We are making everything possible to fix +
        the situation ASAP. Please, contact us at support@ksense.io. Useful information may be found in developer console</p>)


export function GlobalError(props) {
    let text = props.children ? props.children : DEFAULT_ERROR_TEXT;
    return (<div style={{}} className="error-wrapper">
        <img src={plumber} alt="[loading]" className="error-image" />
        <div className="error-text">
            {text}
        </div>
    </div>);
}

