/**
 * Library of small components that are usefull for different purposes
 */

import React, {ReactNode, useState} from "react";
import './components.less'
import {Input, message, Spin, Tag, Tooltip} from "antd";
import {PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons/lib";

const loader = require("../../icons/loading.gif").default;
const plumber = require("../../icons/plumber.png").default;

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
        <img src={loader} alt="[loading]" className="preloader-image"/>
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
        <img src={plumber} alt="[loading]" className="error-image"/>
        <div className="error-text">
            {text}
        </div>
    </div>);
}

export function CenteredSpin() {
    return (<div className="common-centered-spin"><Spin size="large"/></div>)
}

export function LabelWithTooltip({children, documentation}) {
    return (
        <span>
              {children}&nbsp;
            <Tooltip title={documentation}>
               <QuestionCircleOutlined/>
              </Tooltip>
            </span>
    )
}

/**
 * Default handler for error: show message and log error to console
 */
export function defaultErrorHandler(error: any, errorDescription: string) {

    if (errorDescription !== undefined) {
        if (error.message) {
            message.error(`${errorDescription}: ${error.message}`)
            console.error(`Error occurred - ${errorDescription} - ${error.message}`, error);
        } else {
            message.error(`${errorDescription}`)
            console.error(`Error occurred - ${errorDescription}`, error);
        }
    } else {
        if (error.message) {
            message.error(`${error.message}`)
            console.error(`Error occurred - ${error.message}`, error);
        } else {
            message.error('Unknown error')
            console.error(`Error occurred`, error);
        }
    }
}

interface ITagInputProps {
    value: any[]
    onChange: () => void
}
