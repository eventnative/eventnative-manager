
import * as React from 'react'

import {NavLink, Route, Switch} from 'react-router-dom';
import {Button, Col, Dropdown, Layout, Menu, message, Modal, Row, Select} from "antd";
import {AreaChartOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PartitionOutlined, SlidersOutlined} from "@ant-design/icons";
import './App.less';
import Popover from "antd/es/popover";
import SubMenu from "antd/es/menu/SubMenu";
import {KeyOutlined, LockOutlined, ExclamationCircleOutlined, UsergroupAddOutlined, UserOutlined} from "@ant-design/icons/lib";
import ApplicationServices from "./lib/services/ApplicationServices";
import {GlobalError, Preloader} from "./lib/components/components";
import LoginForm from "./lib/components/LoginForm/LoginForm";
import SignupForm from "./lib/components/SignupForm/SignupForm";
import {navigateAndReload, reloadPage} from "./lib/commons/utils";
import ApiKeys from "./lib/components/ApiKeys/ApiKeys"
import {User} from "./lib/services/model";
import OnboardingForm from "./lib/components/OnboardingForm/OnboardingForm";
import {Page, PRIVATE_PAGES, PUBLIC_PAGES} from "./navigation";
import {ReactNode} from "react";

const logo = require('./icons/ksense_icon.svg');

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

type AppProperties = {
}

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

    public componentDidMount() {
        window.setTimeout(() => {
            if (this.state.lifecycle == AppLifecycle.LOADING) {
                console.log("Login timout");
                this.setState({lifecycle: AppLifecycle.ERROR, globalErrorDetails: "Timout"})
            }
        }, LOGIN_TIMEOUT);
        this.services.userService.waitForUser().then((loginStatus) => {
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
                        return (<Route path={route.getPrefixedPath()} exact>
                            {route.getComponent()}
                        </Route>)
                    })}
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
        return (
            <span>
                <h1>{route.pageHeader}</h1>
                {route.getComponent()}
            </span>
        );
    }

    appLayout() {
        return (
            <Layout className="app-layout-root">
                {this.headerComponent()}
                <Layout className="app-layout-header-and-content">
                    <Layout.Sider  className="side-bar" theme="light">
                        {App.leftMenu()}
                    </Layout.Sider>
                    <Layout.Content className="app-layout-content">
                        <Switch>
                            {PRIVATE_PAGES.map(route => {
                                return (<Route path={route.getPrefixedPath()} exact>
                                    {this.wrapInternalPage(route)}
                                </Route>)
                            })}
                        </Switch>
                    </Layout.Content>
                </Layout>
                <OnboardingForm user={this.state.user} userSuggestions={null} visible={this.state.showOnboardingForm}/>
            </Layout>
        );
    }

    private static leftMenu() {
        return <Switch>
            <Menu mode="inline" defaultSelectedKeys={['1']} className="theme-blue-bg sidebar-menu">
                <Menu.Item key="status" icon={<PartitionOutlined/>}>
                    <NavLink to="/dashboard" activeClassName="selected">Status</NavLink>
                </Menu.Item>
                <Menu.Item key="connections" icon={<AreaChartOutlined/>}>
                    <NavLink to="/connectors" activeClassName="selected">Connections</NavLink>
                </Menu.Item>
                <Menu.Item key="destinations" icon={<AreaChartOutlined/>}>
                    <NavLink to="/destinations" activeClassName="selected">Destinations</NavLink>
                </Menu.Item>
                <Menu.Item key="api_keys" icon={<KeyOutlined/>}>
                    <NavLink to="/api_keys" activeClassName="selected">API Keys</NavLink>
                </Menu.Item>
                <SubMenu title="Project Settings" icon={<SlidersOutlined/>}>
                    <Menu.Item key="general_settins" icon={<AreaChartOutlined/>}>
                        <NavLink to="/project_settings" activeClassName="selected">Access & General</NavLink>
                    </Menu.Item>
                    <Menu.Item key="users" icon={<UsergroupAddOutlined/>}>
                        <NavLink to="/users" activeClassName="selected">Users</NavLink>
                    </Menu.Item>
                </SubMenu>
            </Menu>
        </Switch>;
    }

    private headerComponent() {
        return <Layout.Header className="app-layout-header">
            <Row>
                <Col className="gutter-row" span={4}>
                    <img className="logo" src={logo} alt="[logo]"/>
                    <span className="logo-text">kSense</span>
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
            icon: <ExclamationCircleOutlined />,
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
            onCancel: () => {}
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