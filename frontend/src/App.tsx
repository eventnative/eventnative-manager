import * as React from 'react'

import {NavLink, Route, Switch, Redirect} from 'react-router-dom';
import {Button, Col, Dropdown, Form, Input, Layout, Menu, message, Modal, Row, Select} from "antd";

import LogoutOutlined from "@ant-design/icons/lib/icons/LogoutOutlined";
import CloudOutlined from "@ant-design/icons/lib/icons/CloudOutlined";
import AreaChartOutlined from "@ant-design/icons/lib/icons/AreaChartOutlined";
import SlidersOutlined from "@ant-design/icons/lib/icons/SlidersOutlined";
import ExclamationCircleOutlined from "@ant-design/icons/lib/icons/ExclamationCircleOutlined";
import UserOutlined from "@ant-design/icons/lib/icons/UserOutlined";
import UnlockOutlined from "@ant-design/icons/lib/icons/UnlockOutlined";
import DownloadOutlined from "@ant-design/icons/lib/icons/DownloadOutlined";
import NotificationOutlined from "@ant-design/icons/lib/icons/NotificationOutlined";


import './App.less';
import ApplicationServices, {setDebugInfo} from "./lib/services/ApplicationServices";
import {Align, CenteredSpin, GlobalError, handleError, Preloader} from "./lib/components/components";
import {reloadPage} from "./lib/commons/utils";
import {User} from "./lib/services/model";
import OnboardingForm from "./lib/components/OnboardingForm/OnboardingForm";
import {Page, PRIVATE_PAGES, PUBLIC_PAGES} from "./navigation";
import {ReactNode, useState} from "react";

import logo from './icons/logo.svg';

enum AppLifecycle {
    LOADING, //Application is loading
    REQUIRES_LOGIN, //Login form is displayed
    APP, //Application
    ERROR //Global error (maintenance)
}

type AppState = {
    showOnboardingForm: boolean;
    lifecycle: AppLifecycle
    loginErrorMessage?: string
    globalErrorDetails?: string
    extraControls?: React.ReactNode
    user?: User
}

type AppProperties = {
    location: string
}

const LOGIN_TIMEOUT = 5000;
export default class App extends React.Component<AppProperties, AppState> {
    private readonly services: ApplicationServices

    constructor(props: AppProperties, context: any) {
        super(props, context);
        console.log("Location", props.location)
        this.services = ApplicationServices.get();
        this.state = {
            lifecycle: AppLifecycle.LOADING,
            showOnboardingForm: false,
            extraControls: null
        }

    }

    public async componentDidMount() {
        window.setTimeout(() => {
            if (this.state.lifecycle == AppLifecycle.LOADING) {
                console.log("Login timout");
                this.setState({lifecycle: AppLifecycle.ERROR, globalErrorDetails: "Timout"})
            }
        }, LOGIN_TIMEOUT);
        this.services.userService.waitForUser().then((loginStatus) => {
            setDebugInfo('user', loginStatus.user);
            this.services.analyticsService.onUserKnown(loginStatus.user)
            this.setState({
                lifecycle: loginStatus.user ? AppLifecycle.APP : AppLifecycle.REQUIRES_LOGIN,
                user: loginStatus.user,
                showOnboardingForm: loginStatus.user && !loginStatus.user.onboarded,
                loginErrorMessage: loginStatus.loginErrorMessage
            })
        }).catch((error) => {
            console.error("Failed to get user", error);
            this.setState({lifecycle: AppLifecycle.ERROR});
        });

    }

    public render() {
        switch (this.state.lifecycle) {
            case AppLifecycle.REQUIRES_LOGIN:
                return (<Switch>
                    {PUBLIC_PAGES.map(route => {
                        return (<Route //key={route.getPrefixedPath()}
                            path={route.getPrefixedPath()}
                            exact
                            render={(routeProps) => {
                                this.services.analyticsService.onPageLoad({
                                    pagePath: routeProps.location.key
                                })
                                document.title = route.pageTitle;
                                return route.getComponent({});
                            }}
                        />)
                    })}
                    <Redirect key="rootRedirect" to="/"/>
                </Switch>);
            case AppLifecycle.APP:
                return this.appLayout();
            case AppLifecycle.ERROR:
                return (<GlobalError/>);
            case AppLifecycle.LOADING:
                return (<Preloader/>);

        }
    }

    public wrapInternalPage(route: Page, props: any): ReactNode {
        let component = route.getComponent({
            ...props, setExtraHeaderComponent: (node) => {
                this.setState({extraControls: node});
            }
        });
        return (
            <div className={["internal-page-wrapper", "page-" + route.id + "-wrapper"].join(" ")}>
                <Row className="internal-page-header-container">
                    <Col span={12}>
                        <h1 className="internal-page-header">{route.pageHeader}</h1>
                    </Col>
                    <Col span={12}>
                        <Align horizontal="right">
                            {this.state.extraControls}
                            <Dropdown trigger={["click"]} overlay={this.getUserDropDownMenu()}>
                                <Button className={"user-drop-down-button"} icon={<UserOutlined/>}>{this.state.user.name}</Button>
                            </Dropdown>
                        </Align>
                    </Col>
                </Row>
                <div className="internal-page-content-wrapper">
                    {component}
                </div>
            </div>
        );
    }

    appLayout() {
        let routes = PRIVATE_PAGES.map(route => {
            if (!this.state.showOnboardingForm) {
                return (<Route key={route.id}
                               path={route.getPrefixedPath()}
                               exact={true}
                               render={(routeProps) => {
                                   this.services.analyticsService.onPageLoad({
                                       pagePath: routeProps.location.hash
                                   });
                                   document.title = route.pageTitle;
                                   return this.wrapInternalPage(route, {});
                               }}/>);
            } else {
                return (<CenteredSpin/>)
            }
        });
        routes.push(<Redirect key="dashboardRedirect" to="/dashboard"/>);
        let extraForms = null;
        if (this.state.showOnboardingForm) {
            extraForms = <OnboardingForm user={this.state.user} onCompleted={async () => {
                await this.services.userService.waitForUser();
                this.setState({showOnboardingForm: false})
            }}/>
        } else if (this.services.userService.getUser().forcePasswordChange) {
            return <SetNewPassword onCompleted={async () => {
                reloadPage();
            }}/>
        }
        return (
            <Layout className="app-layout-root">
                <Layout className="app-layout-header-and-content">
                    <Layout.Sider key="sider" className="side-bar" theme="light">
                        <a className="app-logo-wrapper" href="https://eventnative.com">
                            <img className="app-logo" src={logo} alt="[logo]"/>
                        </a>
                        {this.leftMenu()}
                    </Layout.Sider>
                    <Layout.Content key="content" className="app-layout-content">
                        <Switch>
                            {routes}
                        </Switch>
                    </Layout.Content>
                </Layout>
                {extraForms}
            </Layout>
        );
    }

    private leftMenu() {
        let key = this.props.location === '/' || this.props.location === "" ? 'dashboard' : this.props.location;
        if (key.charAt(0) === '/') {
            key = key.substr(1);
        }
        return <Menu mode="inline" defaultSelectedKeys={[key]} className="theme-blue-bg sidebar-menu">
            <Menu.Item key="dashboard" icon={<AreaChartOutlined/>}>
                <NavLink to="/dashboard" activeClassName="selected">Status</NavLink>
            </Menu.Item>
            <Menu.Item key="api_keys" icon={<UnlockOutlined/>}>
                <NavLink to="/api_keys" activeClassName="selected">Event API Keys</NavLink>
            </Menu.Item>
            {/*<Menu.Item key="sources" icon={<ApiOutlined/>}>*/}
            {/*    <NavLink to="/sources" activeClassName="selected">Sources</NavLink>*/}
            {/*</Menu.Item>*/}
            <Menu.Item key="destinations" icon={<NotificationOutlined/>}>
                <NavLink to="/destinations" activeClassName="selected">Destinations</NavLink>
            </Menu.Item>
            <Menu.Item key="domains" icon={<CloudOutlined/>}>
                <NavLink to="/domains" activeClassName="selected">Custom Domains</NavLink>
            </Menu.Item>
            <Menu.Item key="cfg_download" icon={<DownloadOutlined/>}>
                <NavLink to="/cfg_download" activeClassName="selected">Download EN Config</NavLink>
            </Menu.Item>
        </Menu>;
    }

    private headerComponent() {
        return <Layout.Header className="app-layout-header">
            <Row>
                <Col className="gutter-row" span={20}>
                    <div className="user-menu">
                        <Dropdown trigger={["click"]} overlay={this.getUserDropDownMenu()}>
                            <Button icon={<UserOutlined/>}>{this.state.user.name}</Button>
                        </Dropdown>
                    </div>
                </Col>
            </Row>
        </Layout.Header>;
    }

    private resetPassword() {
        Modal.confirm({
            title: 'Password reset',
            icon: <ExclamationCircleOutlined/>,
            content: 'Please confirm password reset. Instructions will be sent to your email',
            okText: 'Reset password',
            cancelText: 'Cancel',
            onOk: () => {
                this.services.userService.sendPasswordReset()
                    .then(() => message.info("Reset password instructions has been sent. Please, check your mailbox"))
                    .catch((error) => {
                        message.error("Can't reset password: " + error.message);
                        console.log("Can't reset password", error)
                    })
            },
            onCancel: () => {
            }
        });

    }

    private getUserDropDownMenu() {
        return <div>
            <div className="user-dropdown-info-panel">{this.state.user.email}</div>
            <Menu>
                <Menu.Item key="profile" icon={<SlidersOutlined/>} onClick={() => this.resetPassword()}>
                    Reset Password
                </Menu.Item>
                <Menu.Item key="logout" icon={<LogoutOutlined/>} onClick={() => this.services.userService.removeAuth(reloadPage)}>
                    Logout
                </Menu.Item>
            </Menu>
        </div>;
    }
}


function SetNewPassword({onCompleted}: { onCompleted: () => Promise<void> }) {
    let [loading, setLoading] = useState(false);
    let services = ApplicationServices.get();
    let [form] = Form.useForm();
    return <Modal
        title="Please, set a new password" visible={true} closable={false}
        footer={<>
            <Button onClick={() => {
                services.userService.removeAuth(reloadPage);
            }}>Logout</Button>
            <Button type="primary" loading={loading} onClick={async () => {
                setLoading(true);
                let values;
                try {
                    values = await form.validateFields();
                } catch (e) {
                    //error will be displayed on the form, not need for special handling
                    setLoading(false);
                    return;
                }

                try {
                    let newPassword = values['password'];
                    await services.userService.changePassword(newPassword);
                    await services.userService.login(services.userService.getUser().email, newPassword)
                    let user = (await services.userService.waitForUser()).user;
                    user.forcePasswordChange = false;
                    await services.userService.update(user);
                    await onCompleted();

                } catch (e) {
                    if ("auth/requires-recent-login" === e.code) {
                        services.userService.removeAuth(() => {
                            reloadPage();
                        });
                    } else {
                        handleError(e);
                    }
                } finally {
                    setLoading(false);
                }

            }}>Set new password</Button>
        </>}>
        <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
                name="password"
                label="Password"
                rules={[
                    {
                        required: true,
                        message: 'Please input your password!',
                    },
                ]}
                hasFeedback>
                <Input.Password/>
            </Form.Item>

            <Form.Item
                name="confirm"
                label="Confirm Password"
                dependencies={['password']}
                hasFeedback
                rules={[
                    {
                        required: true,
                        message: 'Please confirm your password!',
                    },
                    ({getFieldValue}) => ({
                        validator(rule, value) {
                            if (!value || getFieldValue('password') === value) {
                                return Promise.resolve();
                            }
                            return Promise.reject('The two passwords that you entered do not match!');
                        },
                    }),
                ]}>
                <Input.Password/>
            </Form.Item>
        </Form>
    </Modal>


}