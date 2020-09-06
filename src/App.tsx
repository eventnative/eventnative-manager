
import * as React from 'react'

import {BrowserRouter, Redirect, Route, Switch, Link, HashRouter, NavLink} from 'react-router-dom';
const logo = require('./icons/ksense_icon.svg');
import {Layout, Menu, Row, Col, Button, Space, Card, Spin} from "antd";
import {
    UserOutlined,
    VideoCameraOutlined,
    UploadOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AreaChartOutlined,
    PartitionOutlined,
    LogoutOutlined
} from "@ant-design/icons";
import './App.less';
import './App.less';
import Popover from "antd/es/popover";
import ApplicationServices from './lib/services/ApplicationServices';
import {StyledFirebaseAuth} from "react-firebaseui";
import * as firebase from 'firebase';
import {alert} from "./lib/commons/utils";

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
        this.unregisterAuthObserver = this.services.firebase().auth().onAuthStateChanged(
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
        let userMenu = (
            <Menu>
                <Menu.Item key="1" icon={<LogoutOutlined/>} onClick={() => firebase.auth().signOut().then(() => {
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
                            <Menu.Item key="1" icon={<AreaChartOutlined/>}>
                                <NavLink to="/dashboard" activeClassName="selected">Dashboard</NavLink>
                            </Menu.Item>
                            <Menu.Item key="2" icon={<PartitionOutlined/>}>
                                <NavLink to="/config" activeClassName="selected">Config</NavLink>
                            </Menu.Item>
                        </Menu>
                    </Switch>
                </Layout.Sider>
                <Layout>
                    <Layout.Header className="theme-blue-bg" style={{padding: 0}}>
                        <Row>
                            <Col className="gutter-row" span={22}>
                                {React.createElement(this.state.menuCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: 'trigger',
                                    onClick: this.toggleMenu,
                                })}
                            </Col>
                            <Col className="gutter-row" span={2}>
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
                    <StyledFirebaseAuth uiConfig={this.firebaseSignInUIConfig} firebaseAuth={this.services.firebase().auth()}/>
                </Card>
        );
    }
}

