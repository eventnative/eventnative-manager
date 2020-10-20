/**
 * Library of small components that are usefull for different purposes
 */

import React, {ReactNode} from "react";
import './components.less'
import {Card, message, Spin, Tooltip} from "antd";
import {CaretDownFilled, CaretRightFilled, CaretUpFilled, QuestionCircleOutlined} from "@ant-design/icons/lib";
import ApplicationServices from "../services/ApplicationServices";
import {numberFormat, withDefaults} from "../commons/utils";

const plumber = require("../../icons/plumber.png").default;

type IPreloaderProps = {
    text?: string
}

/**
 * Loader component. A spinner and text positioned in the center of parent component, assuming
 * parent's component display = block
 */
export function Preloader(props: IPreloaderProps) {
    let text = props.text ? props.text : "Loading user data..."
    //do not change img src here. We need to make sure that the image url is the same as
    //in pre-react boot loader
    return (<div style={{}} className="preloader-wrapper">
        <img src="boot/loading.gif" alt="[loading]" className="preloader-image"/>
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

export function CenteredError({error}) {
    return (<div className="common-centered-spin">Error: {error?.message ? error.message : "Unknown error"}</div>)
}

export function LabelWithTooltip(props: { children?: React.ReactNode, documentation: React.ReactNode }) {
    return (
        <span className="label-with-tooltip">
              {props.children ? props.children : ""}&nbsp;
            <Tooltip title={props.documentation}>
               <QuestionCircleOutlined/>
              </Tooltip>
            </span>
    )
}

function formatPercent(num: number) {
    let res = (num * 100).toFixed(2);
    if (res.indexOf(".") >= 0) {
        while ((res.endsWith("0")) && res.length > 1) {
            res = res.substr(0, res.length - 1);
        }
    }
    if (res.endsWith(".")) {
        res = res.substr(0, res.length - 1);
    }
    return res;

}

export function StatCard({value, ...otherProps}) {
    let formatter = otherProps['format'] ? otherProps['format'] : numberFormat({});

    let extraClassName;
    let icon;
    let percent;
    let valuePrev = otherProps['valuePrev'];
    delete otherProps['valuePrev'] //stop propagating prop to DOM
    if (valuePrev !== undefined) {
        if (valuePrev < value) {
            extraClassName = "stat-card-growth stat-card-comparison"
            icon = <CaretUpFilled/>
            percent = valuePrev == 0 ? "∞" : formatPercent(value / valuePrev - 1)
        } else if (valuePrev > value) {
            extraClassName = "stat-card-decline stat-card-comparison"
            icon = <CaretDownFilled/>
            percent = value == 0 ? "∞" : formatPercent(valuePrev / value - 1)
        } else {
            extraClassName = "stat-card-flat stat-card-comparison"
            icon = <CaretRightFilled/>
            percent = "0"
        }
    }
    let extra = <>
        <Tooltip trigger={["click", "hover"]} title={(<>Value for previous period: <b>{formatter(valuePrev)}</b></>)}>
            <div className={extraClassName}>
                {icon}{percent}%
            </div>
        </Tooltip>
    </>;
    let props = {...otherProps};
    if (valuePrev !== undefined) {
        props['extra'] = extra
    } else {
        props['extra'] = " ";
    }
    return <Card className="stat-card" {...props}>
        <div className="stat-card-number">
            {formatter(value)}
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

enum ComponentLifecycle {
    LOADED, ERROR, WAITING
}

/**
 * Component that loads initial state through a chain of external calls
 * This abstract class displays spinner while the data is loaded. And once data is loaded,
 * the content will fade in
 */
export abstract class LoadableComponent<P, S> extends React.Component<P, S> {

    protected constructor(props: P, context: any) {
        super(props, context);
        if (!this.state) {
            this.state = this.emptyState();
        }
    }

    private getLifecycle(): ComponentLifecycle {
        return this.state['__lifecycle'] === undefined ? ComponentLifecycle.WAITING : this.state['__lifecycle'];
    }

    emptyState(): S {
        return ({} as S)
    }

    async componentDidMount() {
        try {
            let newState = await this.load();
            this.setState({...newState, __lifecycle: ComponentLifecycle.LOADED});
        } catch (e) {
            this.setState(this.errorState(e));
            handleError(e, "Failed to load data from server");
        }
    }


    private errorState(e) {
        let newState = {};
        newState['__lifecycle'] = ComponentLifecycle.ERROR;
        newState['__errorObject'] = e;
        return newState;
    }

    render() {
        let lifecycle = this.getLifecycle();
        if (lifecycle === ComponentLifecycle.WAITING) {
            return <CenteredSpin/>
        } else if (lifecycle === ComponentLifecycle.ERROR) {
            return LoadableComponent.error(this.state['__errorObject'])
        } else {
            try {
                return <div className={this.state['__doNotFadeIn'] === true ? "" : "common-component-fadein"}>{this.renderReady()}</div>
            } catch (e) {
                console.error("Error rendering state", e)
                return LoadableComponent.error(e);
            }
        }

    }

    /**
     * Renders component assuming initial state is loaded
     */
    protected abstract renderReady(): ReactNode;

    /**
     * Loads initial state (usually from server)
     */
    protected abstract load(): Promise<S>;

    /**
     * Async state reload. Display loading indicator, wait for new state, display it. Callback can return undefined, in that
     * case state won't be refreshed. If it returns the value, it will be treated as a new state.
     *
     * Also, fadein effect is disabled for reload
     */
    protected async reload(callback?: () => Promise<any | void>) {
        if (!callback) {
            callback = async () => {
                return this.load();
            }
        }
        this.setState((state) => {
            state['__lifecycle'] = ComponentLifecycle.WAITING;
        })
        try {
            let result = await callback();
            if (result === undefined) {
                this.setState((state) => {
                    state['__lifecycle'] = ComponentLifecycle.LOADED;
                    state['__doNotFadeIn'] = true;
                });
            } else {
                result['__lifecycle'] = ComponentLifecycle.LOADED;
                result['__doNotFadeIn'] = true;
                this.setState(result as S);
            }
        } catch (e) {
            this.setState(this.errorState(e))
        }

    }


    private static error(error: Error): ReactNode {
        function firstToLower(string: string) {
            if (string.length > 0) {
                return string.charAt(0).toLowerCase() + string.slice(1);
            }
            return string;
        }

        return <div className="common-error-wrapper">
            <div className="common-error-details"><b>Error occurred</b>: {firstToLower(error.message ? error.message : "Unknown error")}<br />See details in console log</div>
        </div>
    }
}

type HorizontalAlign = "center" | "right" | "left";
type VerticalAlign = "top" | "bottom" | "center"
type IAlignProps = {
    children: ReactNode
    //vertical?: HorizontalAlign;
    horizontal?: HorizontalAlign;
}


const HORIZONTAL_ALIGN_MAP: Record<HorizontalAlign, string> = {
    "center": "center",
    "right": "right",
    "left": "left"
};

/**
 * Component to align content within. See props type for configuration
 */
export function Align(props: IAlignProps) {
    props = withDefaults(props, {
        horizontal: "left"
    });

    // @ts-ignore
    return <div style={{textAlign: HORIZONTAL_ALIGN_MAP[props.horizontal]}}>{props.children}</div>
}

export function lazyComponent(importFactory) {
    let LazyComponent = React.lazy(importFactory);
    return (props) => {
        return <React.Suspense fallback={<CenteredSpin/>}>
            <LazyComponent {...props} />
        </React.Suspense>
    }
}

export function Nbsp({}) {
    return '\u00A0';
}


