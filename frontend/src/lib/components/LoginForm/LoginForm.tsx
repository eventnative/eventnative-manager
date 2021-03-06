import * as React from 'react'
import {Button, Card, Col, Form, Input, message, Modal, Row} from "antd";

import LockOutlined from "@ant-design/icons/lib/icons/LockOutlined";
import UserOutlined from "@ant-design/icons/lib/icons/UserOutlined";
import MailOutlined from "@ant-design/icons/lib/icons/MailOutlined";


const logo = require('../../../icons/logo.svg');
const googleLogo = require('../../../icons/google.svg');
const githubLogo = require('../../../icons/github.svg');
import './LoginForm.less'
import ApplicationServices from "../../services/ApplicationServices";
import {navigateAndReload, reloadPage} from "../../commons/utils";
import {useState} from "react";
import {NavLink} from "react-router-dom";

type State = {
    loading: boolean
    showPasswordReset?: boolean
}

type Props = {
    errorMessage?: string
}

export default class LoginForm extends React.Component<Props, State> {
    private services: ApplicationServices;

    constructor(props: Readonly<any>) {
        super(props);
        this.services = ApplicationServices.get();
        this.state = {
            loading: false,
            showPasswordReset: false
        }
    }


    render() {
        // if (this.props.errorMessage) {
        //     message.error(this.props.errorMessage);
        // }
        let title = (
            <div className="login-form-header-container">
                <img src={logo} alt="[logo]" className="login-form-logo"/>
                <span className="logon-form-title">Welcome Back!</span>
            </div>
        );
        return (<>
            <PasswordResetForm
                key="password-reset-form"
                visible={this.state.showPasswordReset}
                close={() => this.setState({showPasswordReset: false})}
                onSuccess={() => message.info("Password reset e-mail has been sent!")}
            />
            <Card title={title} style={{margin: 'auto', 'marginTop': '100px', 'maxWidth': '500px'}} bordered={false}>
                <Row>
                    <Col span={12} className="login-form-left-panel">
                        <Form
                            name="normal_login"
                            className="login-form"
                            initialValues={{
                                remember: true,
                            }}
                            onFinish={(values) => this.passwordLogin(values)}>
                            <Form.Item
                                name="username"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please, input your e-mail!',
                                    },
                                ]}>
                                <Input prefix={<MailOutlined/>} placeholder="E-Mail"/>
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your password!',
                                    },
                                ]}>
                                <Input
                                    prefix={<LockOutlined className="site-form-item-icon"/>}
                                    type="password"
                                    placeholder="Password"
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button key="pwd-login-button" type="primary" htmlType="submit" className="login-form-button" loading={this.state.loading}>
                                    {this.state.loading ? "" : "Log in"}
                                </Button>
                                <div>
                                    <a className="login-right-forgot" onClick={() => this.setState({showPasswordReset: true})}>
                                        Forgot password?
                                    </a>
                                </div>
                            </Form.Item>
                        </Form>
                    </Col>
                    <Col span={12} className="login-form-right-panel">
                        <Form style={{float: 'right'}}>
                            <Form.Item>
                                <Button key="google-login-button" icon={<img src={googleLogo} height={16} alt=""/>} onClick={(e) => this.googleLogin()}>
                                    Sign in with Google
                                </Button>
                            </Form.Item>
                            <Form.Item>
                                <Button key="github-login-button" icon={<img src={githubLogo} height={16} alt=""/>} onClick={() => this.githubLogin()}>Sign in with Github</Button>
                            </Form.Item>
                        </Form>
                    </Col>
                </Row>
                <div className="login-form-signup">
                    <div>Don't have an account?</div>
                    <Button shape="round" className="login-form-signup-button" onClick={() => navigateAndReload("#/register")}>
                        <NavLink to="/register">Sign Up!</NavLink>
                    </Button>
                </div>

            </Card></>);
    }

    private passwordLogin(values) {
        this.services.userService.login(values['username'].trim(), values['password'].trim()).then(() => {
            message.destroy()
            this.setState({loading: false});
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Error", error);
            message.error("Invalid login or password")
            this.setState({loading: false});
        });
    }

    private googleLogin() {
        this.services.userService.initiateGoogleLogin().then(() => {
            message.destroy()
            this.setState({loading: false});
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Access denied: " + error.message)
        });
    }

    private githubLogin() {
        this.services.userService.initiateGithubLogin().then(() => {
            message.destroy()
            this.setState({loading: false});
            reloadPage();
        }).catch(error => {
            message.destroy()
            console.log("Google auth error", error);
            message.error("Access denied: " + error.message)
        });
    }
}

function PasswordResetForm({visible, onSuccess, close}) {
    let services = ApplicationServices.get();
    const [state, setState] = useState({
        loading: false,
        errorMessage: null
    })
    const [form] = Form.useForm();

    const onSubmit = () => {
        setState({loading: true, errorMessage: null});
        form
            .validateFields()
            .then((values) => {
                services.userService.sendPasswordReset(values['email']).then(() => {
                    onSuccess();
                    close()
                    setState({loading: false, errorMessage: null})
                }).catch((error) => {
                    message.error(error.message)
                    setState({loading: false, errorMessage: error.message});
                })
            })
            .catch(error => {
                setState({loading: false, errorMessage: error.message});
            });
    }

    return (<Modal
        title="Password reset. Please, enter your email"
        visible={visible}
        closable={true}
        onCancel={close}
        footer={[
            <Button key="close" onClick={close}>Cancel</Button>,
            <Button key="submit" type="primary" loading={state.loading} onClick={onSubmit}>Submit</Button>,
        ]}>
        <Form
            layout="vertical"
            form={form}
            name="password-reset-form"
            className="password-reset-form"
        >
            <Form.Item
                name="email"
                rules={[
                    {
                        required: true,
                        message: 'Email can\'t be empty!',
                    },
                ]}
            >
                <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="E-mail"/>
            </Form.Item>
        </Form>
    </Modal>);

}
