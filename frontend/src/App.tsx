
import * as React from 'react'

import {BrowserRouter, Redirect, Route, Switch, Link, HashRouter, NavLink} from 'react-router-dom';
const logo = require('./icons/ksense_icon.svg');
import {Layout, Menu, Row, Col, Button, Space, Card, Spin, Select} from "antd";
import {
    UserOutlined,
    VideoCameraOutlined,
    UploadOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AreaChartOutlined,
    PartitionOutlined,
    LogoutOutlined,
    SlidersOutlined
} from "@ant-design/icons";
import './App.less';
import './App.less';
import Popover from "antd/es/popover";
import {StyledFirebaseAuth} from "react-firebaseui";
import * as firebase from 'firebase';
import {alert} from "./lib/commons/utils";
import SubMenu from "antd/es/menu/SubMenu";
import {UsergroupAddOutlined} from "@ant-design/icons/lib";
import ApplicationServices from "./lib/services/ApplicationServices";

enum AppLifecycle {
    LOADING, //Application is loading
    LOGIN, //Login form is displayed
    APP, //Application
    ERROR //Global error (maintenance)
}

type AppState = {
    menuCollapsed: boolean
    lifecycle: AppLifecycle
    loginErrorMessage?: string
}

export default class App extends React.Component<{}, AppState> {
    private readonly services: ApplicationServices
    private readonly firebaseSignInUIConfig: any;
    private unregisterAuthObserver: firebase.Unsubscribe;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            menuCollapsed: false,
            lifecycle: AppLifecycle.LOADING
        }
        this.firebaseSignInUIConfig = {
            // Popup signin flow rather than redirect flow.
            signInFlow: 'popup',
            // We will display Google and Facebook as auth providers.
            signInOptions: [
                // {
                //     provider: firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD
                // },
                firebase.auth.GoogleAuthProvider.PROVIDER_ID
            ],
            callbacks: {
                signInSuccessWithAuthResult: () => false
            }
        };
    }

    toggleMenu = () => {
        this.setState((state: AppState) => {
            state.menuCollapsed = !state.menuCollapsed;
        }, () => this.forceUpdate());
    };

    public componentDidMount() {
        this.unregisterAuthObserver = this.services.firebase.auth().onAuthStateChanged(
            (user: any) => {
                this.setState((state: AppState) => {
                    if (user) {
                        state.lifecycle = AppLifecycle.APP;
                    } else {
                        state.lifecycle = AppLifecycle.LOGIN;
                        state.loginErrorMessage = "User doesn't have access";
                    }
                }, () => this.forceUpdate());
            }
        );
    }

    public componentWillUnmount() {
        this.unregisterAuthObserver();
    }

    public render() {
        switch (this.state.lifecycle) {
            case AppLifecycle.LOGIN:
                return this.loginForm();
            case AppLifecycle.APP:
                return this.appLayout();
            case AppLifecycle.ERROR:
                return (<h1>Error</h1>);
            case AppLifecycle.LOADING:
                return (<Spin />);

        }
    }

    appLayout() {
        let projectSelector = (
            <Select
                optionFilterProp="children"
                defaultValue="jack"
            >
                <Select.Option value="project">Jack</Select.Option>
                <Select.Option value="lucy">Lucy</Select.Option>
                <Select.Option value="tom">Tom</Select.Option>
            </Select>
        );
        let userMenu = (
            <Menu>
                <Menu.Item key="profile" icon={<SlidersOutlined/>}>
                    <NavLink to="/profile">Profile</NavLink>
                </Menu.Item>
                <Menu.Item key="logout" icon={<LogoutOutlined/>} onClick={() => firebase.auth().signOut().then(() => {
                    this.setState((state: AppState) => {
                        state.lifecycle = AppLifecycle.LOGIN;
                    })
                })}>
                    Logout
                </Menu.Item>
            </Menu>);
        return (
            <Layout>
                <Layout.Sider trigger={null} collapsible collapsed={this.state.menuCollapsed} className="side-bar">
                    <img className="logo" src={logo} alt="[logo]"/>
                    {this.state.menuCollapsed ? (<span/>) : (<span className="logoText">kSense</span>)}
                    <Switch>
                        <Menu mode="inline" defaultSelectedKeys={['1']} className="theme-blue-bg sidebar-menu">
                            <Menu.Item key="status" icon={<PartitionOutlined />}>
                                <NavLink to="/dashboard" activeClassName="selected">Status</NavLink>
                            </Menu.Item>
                            <Menu.Item key="connections" icon={<AreaChartOutlined/>}>
                                <NavLink to="/connectors" activeClassName="selected">Connections</NavLink>
                            </Menu.Item>
                            <Menu.Item key="destinations" icon={<AreaChartOutlined/>}>
                                <NavLink to="/destinations" activeClassName="selected">Destinations</NavLink>
                            </Menu.Item>
                            <SubMenu title="Project Settings" icon={<SlidersOutlined />}>
                                <Menu.Item key="general_settins" icon={<AreaChartOutlined/>}>
                                    <NavLink to="/project_settings" activeClassName="selected">Access & General</NavLink>
                                </Menu.Item>
                                <Menu.Item key="users" icon={<UsergroupAddOutlined />}>
                                    <NavLink to="/users" activeClassName="selected">Users</NavLink>
                                </Menu.Item>
                            </SubMenu>
                        </Menu>
                    </Switch>
                </Layout.Sider>
                <Layout>
                    <Layout.Header className="theme-blue-bg" style={{padding: 0}}>
                        <Row>
                            <Col className="gutter-row" span={20}>
                                {React.createElement(this.state.menuCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: 'trigger',
                                    onClick: this.toggleMenu,
                                })}
                            </Col>
                            <Col span={3}>
                                {projectSelector}
                            </Col>
                            <Col className="gutter-row" span={1}>
                                <div className="user-menu">
                                    <Popover content={userMenu} trigger="click">
                                        <UserOutlined style={{color: 'white'}}/>
                                    </Popover>
                                </div>
                            </Col>
                        </Row>
                    </Layout.Header>
                    <Layout.Content
                        className="site-layout-background"
                        style={{
                            margin: '24px 16px',
                            padding: 24,
                            minHeight: 280,
                        }}
                    >
                        <Switch>
                            <Route path={["/dashboard", "/"]} exact>
                                Dashboard2
                            </Route>
                            <Route path="/config">
                                Config
                            </Route>
                        </Switch>
                    </Layout.Content>
                </Layout>
            </Layout>
        );
    }

    loginForm() {
        let title = (
            <div style={{"textAlign": "center"}}>
                <img src={logo} alt="[logo]" /> <span style={{'fontSize': '18px'}}>kSense Login</span>
            </div>
        );
        return (
                <Card title={title} style={{margin: 'auto', 'marginTop': '100px', 'maxWidth': '400px'}}>
                    <StyledFirebaseAuth uiConfig={this.firebaseSignInUIConfig} firebaseAuth={this.services.firebase.auth()}/>
                </Card>
        );
    }
}

