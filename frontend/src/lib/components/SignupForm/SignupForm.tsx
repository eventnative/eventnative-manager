import * as React from 'react'
import {Button, Checkbox, Col, Form, Grid, Input, message, Row} from "antd";
import './SignupForm.less'
import {BankOutlined, LockOutlined, UserOutlined, MailOutlined} from "@ant-design/icons/lib";
import {NavLink} from 'react-router-dom';
import {reloadPage} from "../../commons/utils";
import ApplicationServices from "../../services/ApplicationServices";

const logo = require('../../../icons/ksense_icon.svg').default;

const googleLogo = require('../../../icons/google.svg').default;
const githubLogo = require('../../../icons/github.svg').default;

type State = {
    loading?: boolean
}

export default class SignupForm extends React.Component<any, State> {
    private services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {loading: false}
    }

    googleSignup() {
        this.services.userService.initiateGoogleLogin().then(() => {
            message.destroy()
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Google signup is unavailable: " + error.message)
        });
    }

    githubSignup() {
        this.services.userService.initiateGithubLogin().then(() => {
            message.destroy()
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Github signup is unavailable: " + error.message)
        });
    }

    passwordSignup(values) {
        this.setState({loading: true});
        this.services.userService.createUser(values['email'], values['password'], values['name'],  values['company']).then(() => {
            this.setState({loading: false});
            reloadPage()
        }).catch((error) => {
            message.error("Failed to create user: " + error['message']);
            console.log("Failed to create user", error);
            this.setState({loading: false});
        });

    }


    render() {
        return (
            <div>
                <div className="signup-header">
                    <img src={logo} alt="[logo]" style={{'height': '50px'}}/> <span style={{'fontSize': '18px'}}>Welcome to kSense!</span>
                </div>
                <div className="signup-container">
                    <div className="signup-description">
                        <h3>Start capturing data with EventNative now</h3>
                        <p>We make it easy to take your data in-house. kSense is based on <a href="https://github.com/ksensehq/eventnative">EventNative</a>,
                            our open-source data collection core.</p>

                        <p className="signup-moto">
                            Sign up to own your data!
                        </p>
                        <div className="signup-divider">Or <b><NavLink to="/">Log in</NavLink></b> if you have an account already!</div>

                    </div>
                    <div className="signup-form-container">
                        <Form
                            name="signup-form"
                            className="signup-form"
                            initialValues={{
                                remember: false,
                            }}
                            layout="vertical"
                            onFinish={(values) => this.passwordSignup(values)}
                        >
                            <Row gutter={20}>
                                <Col span={12}>
                                    <Form.Item
                                        name="name"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please, fill in your name!',
                                            },
                                        ]}
                                        label="Name"
                                    >
                                        <Input prefix={<UserOutlined/>} placeholder="Name"/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="company"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please, fill in company name!',
                                            },
                                        ]}
                                        label="Company"
                                    >
                                        <Input prefix={<BankOutlined/>} placeholder="Company or Project name"/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={20}>
                                <Col span={12}>
                                    <Form.Item
                                        name="email"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please input your email!',
                                            }, {type: 'email', message: 'Invalid email format'}
                                        ]}
                                        label="E-mail"
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="E-mail"/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="password"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please input your Password!',
                                            },
                                        ]}
                                        label="Password"
                                    >
                                        <Input
                                            prefix={<LockOutlined/>}
                                            type="password"
                                            placeholder="Password"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div className="signup-checkboxes">
                                <Form.Item name="signup-checkboxes-email">
                                    <Checkbox defaultChecked={true} >
                                        Send me occasional product updates. You may unsubscribe at any time.
                                    </Checkbox>
                                </Form.Item>
                                <Form.Item name="signup-checkboxes-tos">
                                    <Checkbox defaultChecked={true}>
                                        I agree to Terms of Services and Privacy Policy
                                    </Checkbox>
                                </Form.Item>
                            </div>


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
                    </div>
                </div>
            </div>
        );
    }
}