/**
 * Library of small components that are usefull for different purposes
 */

import React, {ReactNode, useState} from "react";
import './components.less'
import {Card, Col, Input, message, Spin, Tag, Tooltip} from "antd";
import {CaretDownFilled, CaretRightFilled, CaretUpFilled, PlusOutlined, QuestionCircleOutlined} from "@ant-design/icons/lib";
import ApplicationServices from "../services/ApplicationServices";

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

function formatPercent(num: number) {
    let res = (num*100).toFixed(2);
    while ((res.endsWith("0") || res.endsWith(".")) && res.length > 1) {
        res = res.substr(0, res.length - 1);
    }
    return res;

}

export function StatCard({value, valuePrev, ...otherProps}) {
    let extraClassName;
    let icon;
    let percent;
    if (valuePrev < value) {
        extraClassName = "stat-card-growth stat-card-comparison"
        icon = <CaretUpFilled />
        percent = valuePrev == 0 ? "∞" : formatPercent(value / valuePrev - 1)
    } else if (valuePrev > value) {
        extraClassName = "stat-card-decline stat-card-comparison"
        icon = <CaretDownFilled />
        percent = value == 0 ? "∞" : formatPercent(valuePrev / value - 1)
    } else {
        extraClassName = "stat-card-flat stat-card-comparison"
        icon = <CaretRightFilled />
        percent = "0"
    }


    let extra = <>
        <div className={extraClassName}>
            {icon}{percent}%
        </div>
    </>;
    return <Card {...otherProps} extra={extra}>
        <div className="stat-card-number">
            {value}
        </div>
    </Card>

}


export function makeErrorHandler(errorDescription: string) {
    return (error) => handleError(error, errorDescription);
}

/**
 * Default handler for error: show message and log error to console
 */
export function handleError(error: any, errorDescription?: string) {

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
    let app = ApplicationServices.get();
    app.analyticsService.onError({
        user: app.userService.hasUser() ? app.userService.getUser() : null,
        error: error
    });
}



