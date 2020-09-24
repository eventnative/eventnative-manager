/**
 * Library of small components that are usefull for different purposes 
 */

import React from "react";
import './components.less'
import {Spin, Tooltip} from "antd";
import {QuestionCircleOutlined} from "@ant-design/icons/lib";

const loader = require("../../icons/loading.gif");
const plumber = require("../../icons/plumber.png");

type IPreloaderProps = {
    text?: string
}
/**
 * Loader component. A spinner and text positioned in the center of parent component, assuming
 * parent's component display = block
 */
export function Preloader(props: IPreloaderProps) {
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

export function CenteredSpin() {
    return (<div className="common-centered-spin"><Spin size="large" /></div>)
}

export function LabelWithTooltip({label, documentation}){
    return (
        <span>
              {label}&nbsp;
            <Tooltip title={documentation}>
               <QuestionCircleOutlined />
              </Tooltip>
            </span>
    )
}

