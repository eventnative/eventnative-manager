import * as React from 'react'
import {Button, Checkbox, Col, Form, Grid, Input, Row} from "antd";
import './SignupForm.less'
import {BankOutlined, LockOutlined, UserOutlined} from "@ant-design/icons/lib";
import {NavLink} from 'react-router-dom';

const logo = require('../../../icons/ksense_icon.svg');

const googleLogo = require('../../../icons/google.svg');
const githubLogo = require('../../../icons/github.svg');

type State = {}

export default class SignupForm extends React.Component<any, State> {

    constructor(props: any, context: any) {
        super(props, context);
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
                                        <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="Name"/>
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
                                        <Input prefix={<BankOutlined className="site-form-item-icon"/>} placeholder="Company or Project name"/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={20}>
                                <Col span={12}>
                                    <Form.Item
                                        name="username"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please input your Username!',
                                            },
                                        ]}
                                        label="E-mail"
                                    >
                                        <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="E-mail"/>
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
                                            prefix={<LockOutlined className="site-form-item-icon"/>}
                                            type="password"
                                            placeholder="Password"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div className="signup-checkboxes">
                                <Form.Item name="signup-checkboxes-email">
                                    <Checkbox checked={true}>
                                        Send me occasional product updates. You may unsubscribe at any time.
                                    </Checkbox>
                                </Form.Item>
                                <Form.Item name="signup-checkboxes-tos">
                                    <Checkbox checked={true}>
                                        I agree to Terms of Services and Privacy Policy
                                    </Checkbox>
                                </Form.Item>
                            </div>


                            <div className="signup-action-buttons">
                                <div>
                                    <Button type="primary" htmlType="submit" className="login-form-button">
                                        Create Account
                                    </Button>
                                </div>
                                <div className="signup-divider">Or sign up with:</div>
                                <div className="signup-thirdparty">
                                    <Button shape="round" icon={<img src={googleLogo} height={16} alt=""/>}>
                                        Sign up with Google
                                    </Button>
                                    <Button shape="round" icon={<img src={githubLogo} height={16} alt=""/>}>Sign up with Github</Button>
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