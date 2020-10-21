import * as React from 'react'

import {NavLink, Route, Switch, Redirect} from 'react-router-dom';
import {Button, Col, Dropdown, Form, Input, Layout, Menu, message, Modal, Row, Select} from "antd";
import {
	AreaChartOutlined, 
	LogoutOutlined, 
	SlidersOutlined,
	ExclamationCircleOutlined,
    UserOutlined,
    UnlockOutlined,
    NotificationOutlined,
    CloudOutlined,
	DownloadOutlined,
} from "@ant-design/icons";

import './App.less';
import ApplicationServices, {setDebugInfo} from "./lib/services/ApplicationServices";
import {CenteredSpin, GlobalError, handleError, Preloader} from "./lib/components/components";
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
    user?: User
}

type AppProperties = {}

const LOGIN_TIMEOUT = 5000;
export default class App extends React.Component<AppProperties, AppState> {
    private readonly services: ApplicationServices

    constructor(props: AppProperties, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            lifecycle: AppLifecycle.LOADING,
            showOnboardingForm: false
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
        let route = new Route(window.location.hash);
        switch (this.state.lifecycle) {
            case AppLifecycle.REQUIRES_LOGIN:
                return (<Switch>
                    {PUBLIC_PAGES.map(route => {
                        return (<Route key={route.getPrefixedPath()}
                                       path={route.getPrefixedPath()}
                                       exact
                                       render={(routeProps) => {
                                           this.services.analyticsService.onPageLoad({
                                               pagePath: routeProps.location
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

    public wrapInternalPage(route: Page): ReactNode {
        let component = route.getComponent({});
        return (
            <div className={["internal-page-wrapper", "page-" + route.id + "-wrapper"].join(" ")}>
                <h1 className="internal-page-header">{route.pageHeader}</h1>
                <div className="internal-page-content-wrapper">
                    {component}
                </div>
            </div>
        );
    }

    appLayout() {
        let routes = PRIVATE_PAGES.map(route => {
            if (!this.state.showOnboardingForm) {
                return (<Route key={route.getPrefixedPath()}
                               path={route.getPrefixedPath()}
                               exact={true}
                               render={(routeProps) => {
                                   this.services.analyticsService.onPageLoad({
                                       pagePath: routeProps.location
                                   });
                                   document.title = route.pageTitle;
                                   return this.wrapInternalPage(route);
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
                {this.headerComponent()}
                <Layout className="app-layout-header-and-content">
                    <Layout.Sider key="sider" className="side-bar" theme="light">
                        {App.leftMenu()}
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

    private static leftMenu() {
        return <Switch>
            <Menu mode="inline" defaultSelectedKeys={['1']} className="theme-blue-bg sidebar-menu">
                <Menu.Item key="status" icon={<AreaChartOutlined/>}>
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
                <Menu.Item key="cfg_download" icon={<DownloadOutlined />}>
                    <NavLink to="/cfg_download" activeClassName="selected">Download EN Config</NavLink>
                </Menu.Item>
            </Menu>
        </Switch>;
    }

    private headerComponent() {
        return <Layout.Header className="app-layout-header">
            <Row>
                <Col span={4}>
                    <a className="app-logo-wrapper" href="https://eventnative.com">
                        <img className="app-logo" src={logo} alt="[logo]"/>
                        <span className="app-logo-text">EventNative</span>
                    </a>
                </Col>
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