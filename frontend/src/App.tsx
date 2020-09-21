import * as React from 'react'

import {NavLink, Route, Switch} from 'react-router-dom';
import {Card, Col, Layout, Menu, Row, Select} from "antd";
import {Form, Input, Button, Checkbox} from 'antd';
import {AreaChartOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PartitionOutlined, SlidersOutlined} from "@ant-design/icons";
import './App.less';
import Popover from "antd/es/popover";
import {StyledFirebaseAuth} from "react-firebaseui";
import * as firebase from 'firebase';
import SubMenu from "antd/es/menu/SubMenu";
import {LockOutlined, UsergroupAddOutlined, UserOutlined} from "@ant-design/icons/lib";
import ApplicationServices from "./lib/services/ApplicationServices";
import {GlobalError, Preloader} from "./lib/components/components";
import LoginForm from "./lib/components/LoginForm/LoginForm";
import SignupForm from "./lib/components/SignupForm/SignupForm";
import {reloadPage} from "./lib/commons/utils";
const logo = require('./icons/ksense_icon.svg');

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

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            menuCollapsed: false,
            lifecycle: AppLifecycle.LOADING
        }

    }

    toggleMenu = () => {
        this.setState((state: AppState) => {
            state.menuCollapsed = !state.menuCollapsed;
        }, () => this.forceUpdate());
    };

    public componentDidMount() {
        this.services.userServices.checkLogin((hasLogin) => {
            this.setState((state: AppState) => {
                if (hasLogin) {
                    state.lifecycle = AppLifecycle.APP;
                } else {
                    state.lifecycle = AppLifecycle.LOGIN;
                    state.loginErrorMessage = "User doesn't have access";
                }
            }, () => this.forceUpdate());
        })
    }

    public render() {
        switch (this.state.lifecycle) {
            case AppLifecycle.LOGIN:
                return (<Switch>
                    <Route path="/register" exact component={SignupForm} />
                    <Route component={LoginForm} />
                </Switch>);
            case AppLifecycle.APP:
                return this.appLayout();
            case AppLifecycle.ERROR:
                return (<GlobalError/>);
            case AppLifecycle.LOADING:
                return (<Preloader/>);

        }
    }

    appLayout() {
        return (
            <Layout className="rootAppLayout">
                <Layout.Sider trigger={null} collapsible collapsed={this.state.menuCollapsed} className="side-bar">
                    <img className="logo" src={logo} alt="[logo]"/>
                    {this.state.menuCollapsed ? (<span/>) : (<span className="logoText">kSense</span>)}
                    {App.leftMenu()}
                </Layout.Sider>
                <Layout>
                    {this.headerComponent()}
                    <Layout.Content
                        className="site-layout-background"
                        style={{
                            margin: '24px 16px',
                            padding: 24,
                            minHeight: 280,
                        }}>
                        <Switch>
                            <Route path={["/dashboard", "/", "/register"]} exact>
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
        return <Layout.Header className="theme-blue-bg" style={{padding: 0}}>
            <Row>
                <Col className="gutter-row" span={20}>
                    {React.createElement(this.state.menuCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                        className: 'trigger',
                        onClick: this.toggleMenu,
                    })}
                </Col>
                <Col span={3}>
                    <Select optionFilterProp="children" defaultValue="jack">
                        <Select.Option value="project">Jack</Select.Option>
                        <Select.Option value="lucy">Lucy</Select.Option>
                        <Select.Option value="tom">Tom</Select.Option>
                    </Select>
                </Col>
                <Col className="gutter-row" span={1}>
                    <div className="user-menu">
                        <Popover content={(
                            <Menu>
                                <Menu.Item key="profile" icon={<SlidersOutlined/>}>
                                    <NavLink to="/profile">Profile</NavLink>
                                </Menu.Item>
                                <Menu.Item key="logout" icon={<LogoutOutlined/>} onClick={() => this.services.userServices.removeAuth(reloadPage)}>
                                    Logout
                                </Menu.Item>
                            </Menu>)} trigger="click">
                            <UserOutlined/>
                        </Popover>
                    </div>
                </Col>
            </Row>
        </Layout.Header>;
    }


    private onFinishFailed() {

    }

    private onFinish() {

    }
}

