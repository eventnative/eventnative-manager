import * as React from 'react'
import {Project, SuggestedUserInfo, User} from "../../services/model";
import {Button, Col, Form, Input, message, Modal} from "antd";
import {LockOutlined, UserOutlined} from "@ant-design/icons/lib";
import {useState} from "react";
import ApplicationServices from "../../services/ApplicationServices";
import * as Utils from "../../commons/utils";
import {reloadPage} from "../../commons/utils";

type State = {
    loading: boolean
}

type Props = {
    user: User
    userSuggestions: SuggestedUserInfo
    visible: boolean
}


export default function OnboardingForm(props: Props) {
    let services = ApplicationServices.get();
    const [state, setState] = useState({
        loading: false
    })
    const [form] = Form.useForm();

    const onSubmit = () => {
        setState({loading: true});
        form
            .validateFields()
            .then((values) => {
                let user = services.userService.getUser();
                user.onboarded = true;
                user.projects = [new Project(
                    Utils.randomId(),
                    values['projectName']
                )];
                user.name = values['userDisplayName']

                services.userService.update(user).then(reloadPage).catch((error) => {
                    console.error("Failed to update user", error);
                    setState({loading: false});
                    message.error("Cannot update user info: " + error.message)
                })
            }).catch(() => {setState({loading: false})})
    }


    return (<Modal
        title="You're almost done! To finish registration, please tell us more about yourself and your company"
        visible={props.visible}
        closable={false}
        footer={[
            <Button key="submit" onClick={() => {
                services.userService.removeAuth(reloadPage);
            }}>Logout</Button>,
            <Button key="submit" type="primary" loading={state.loading} onClick={() => {
                onSubmit()
            }}>Submit</Button>,

        ]}
    >
        <Form
            layout="vertical"
            form={form}
            name="onboarding-form"
            className="onboarding-form"
            initialValues={{
                userDisplayName: props.user.suggestedInfo.name,
                projectName: ""
            }}
        >
            <Form.Item
                name="userDisplayName"
                rules={[
                    {
                        required: true,
                        message: 'Please input your name!',
                    },
                ]}
            >
                <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="Your Name"/>
            </Form.Item>
            <Form.Item
                name="projectName"
                rules={[
                    {
                        required: true,
                        message: 'Company Name',
                    },
                ]}
            >
                <Input prefix={<UserOutlined className="site-form-item-icon"/>} placeholder="Company Name"/>
            </Form.Item>
        </Form>
    </Modal>);
}