import * as React from 'react'
import {Button, Card, Col, Form, Input, message, Row} from "antd";
import {LockOutlined, UserOutlined} from "@ant-design/icons/lib";
import { useHistory } from "react-router-dom";
const logo = require('../../../icons/ksense_icon.svg');
const googleLogo = require('../../../icons/google.svg');
const githubLogo = require('../../../icons/github.svg');
import './LoginForm.less'
import ApplicationServices from "../../services/ApplicationServices";
import * as firebase from "firebase";
import {navigateAndReload} from "../../commons/utils";

type State = {
    loading: boolean
}

export default class LoginForm extends React.Component<any, State> {
    private services: ApplicationServices;

    constructor(props: Readonly<any>) {
        super(props);
        this.services = ApplicationServices.get();
        this.state = {
            loading: false
        }
    }


    render() {
        const layout = {
            labelCol: {
                span: 8,
            },
            wrapperCol: {
                span: 16,
            },
        };
        const tailLayout = {
            wrapperCol: {
                offset: 8,
                span: 16,
            },
        };
        let title = (
            <div style={{"textAlign": "center"}}>
                <img src={logo} alt="[logo]" style={{'height': '50px'}}/> <span style={{'fontSize': '18px'}}>Welcome Back</span>
            </div>
        );
        return (
            <Card title={title} style={{margin: 'auto', 'marginTop': '100px', 'maxWidth': '500px'}} bordered={false}>
                <Row>
                    <Col span={12} className="login-form-left-panel">
                        <Form
                            name="normal_login"
                            className="login-form"
                            initialValues={{
                                remember: true,
                            }}
                            onFinish={(values) => this.passwordLogin(values)}
                        >
                            <Form.Item
                                name="username"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your Username!',
                                    },
                                ]}
                            >
                                <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="Username"/>
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your Password!',
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<LockOutlined className="site-form-item-icon"/>}
                                    type="password"
                                    placeholder="Password"
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" className="login-form-button" loading={this.state.loading}>
                                    {this.state.loading ? "" : "Log in"}
                                </Button>
                                <div>
                                    <a className="login-right-forgot" href="">
                                        Forgot password?
                                    </a>
                                </div>
                            </Form.Item>
                        </Form>
                    </Col>
                    <Col span={12} className="login-form-right-panel">
                        <Form style={{float: 'right'}}>
                            <Form.Item>
                                <Button icon={<img src={googleLogo} height={16} alt="" />} onClick={(e) => this.googleLogin()}>
                                    Sign in with Google
                                </Button>
                            </Form.Item>
                            <Form.Item>
                                <Button icon={<img src={githubLogo} height={16} alt=""/>}>Sign in with Github</Button>
                            </Form.Item>
                        </Form>
                    </Col>
                </Row>
                    <div className="login-form-signup">
                        <div>Don't have an account?</div>
                        <Button shape="round"  className="login-form-signup-button" onClick={() => navigateAndReload("#/register")} >
                            Sign Up!
                        </Button>
                    </div>

            </Card>);
    }

    private passwordLogin(values) {
        this.setState({loading: true});
        firebase.auth().signInWithEmailAndPassword(values['username'], values['password']).then((...params) => {
            this.setState({loading: false});
            message.destroy()
        }).catch(error => {
            message.destroy()
            console.log("Error", error);
            message.error("Invalid login or password")
            this.setState({loading: false});
        });
    }

    private googleLogin() {
        console.log('Google login')
        this.services.firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider()).then(result => {
            var token = result.credential.accessToken;
            var user = result.user;
        }).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            var email = error.email;
        });
    }

    private githubLogin() {

    }
}
