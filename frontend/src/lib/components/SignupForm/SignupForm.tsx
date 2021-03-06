import * as React from 'react'
import {Button, Card, Checkbox, Col, Form, Grid, Input, message, Row} from "antd";
import './SignupForm.less'

import LockOutlined from "@ant-design/icons/lib/icons/LockOutlined";
import MailOutlined from "@ant-design/icons/lib/icons/MailOutlined";

import {NavLink} from 'react-router-dom';
import {navigateAndReload, reloadPage} from "../../commons/utils";
import ApplicationServices from "../../services/ApplicationServices";
import {Align, handleError} from "../components";

const logo = require('../../../icons/logo.svg');

const googleLogo = require('../../../icons/google.svg');
const githubLogo = require('../../../icons/github.svg');

type State = {
    loading?: boolean,
    tosAgree: boolean
}

export default class SignupForm extends React.Component<any, State> {
    private services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {loading: false, tosAgree: true}
    }

    googleSignup() {
        this.services.userService.initiateGoogleLogin().then(() => {
            message.destroy()
            reloadPage();
            // this.services.userService.waitForUser().then(() => )
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Google signup is unavailable: " + error.message)
        });
    }

    githubSignup() {
        this.services.userService.initiateGithubLogin().then(() => {
            message.destroy()
            // this.services.initializeDefaultDestination().then(() => console.log("initialized") ).catch(() => message.error(this.services.onboardingNotCompleteErrorMessage))
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Github signup is unavailable: " + error.message)
        });
    }

    async passwordSignup(values) {
        if (!this.state.tosAgree) {
            message.error("To sign up you need to agree to the terms of service");
            return
        }
        this.setState({loading: true});
        try {
            await this.services.userService.createUser(values['email'], values['password']);
            reloadPage();
        } catch (error) {
            handleError(error);
            this.setState({loading: false});
        }
    }


    render() {
        let title = (
            <div className="login-form-header-container">
                <img src={logo} alt="[logo]" className="login-form-logo"/>
                <div className="logon-form-title">Create an account</div>
            </div>
        );
        return (
            <Card title={title} style={{margin: 'auto', 'marginTop': '100px', 'maxWidth': '500px'}} bordered={false} className="signup-form-card">
                <Form
                    name="signup-form"
                    className="signup-form"
                    initialValues={{
                        remember: false,
                    }}
                    requiredMark={false}
                    layout="vertical"
                    onFinish={(values) => this.passwordSignup(values)}
                >
                    <Form.Item
                        name="email"
                        rules={[
                            {
                                required: true,
                                message: 'Please input your email!',
                            }, {type: 'email', message: 'Invalid email format'}
                        ]}
                        label={<b>E-mail</b>}
                    >
                        <Input prefix={<MailOutlined/>} placeholder="Work email"/>
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: 'Please input your Password!',
                            },
                        ]}
                        label={<b>Password</b>}
                    >
                        <Input
                            prefix={<LockOutlined/>}
                            type="password"
                            placeholder="Password"
                        />
                    </Form.Item>
                    <Form.Item name="agreeToTos" className="signup-checkboxes">
                        <Checkbox defaultChecked={true} onChange={(value) => this.setState({tosAgree: value.target.checked})}>
                            I agree to <a href="https://ksense.io/tos">Terms of Services</a> and <a href="https://ksense.io/privacy">Privacy Policy</a>
                        </Checkbox>
                    </Form.Item>


                    <div className="signup-action-buttons">
                        <div>
                            <Button type="primary" htmlType="submit" className="login-form-button" loading={this.state.loading}>
                                Create Account
                            </Button>
                        </div>
                        <div className="signup-divider">Or sign up with:</div>
                        <div className="signup-thirdparty">
                            <Button shape="round" icon={<img src={googleLogo} height={16} alt=""/>} onClick={() => this.googleSignup()}>
                                Sign up with Google
                            </Button>
                            <Button shape="round" icon={<img src={githubLogo} height={16} alt=""/>} onClick={() => this.githubSignup()}>Sign up with Github</Button>
                        </div>
                        <div><b><NavLink to="/">Log in</NavLink></b> if you have an account</div>
                    </div>
                </Form>
            </Card>
        );
    }
}