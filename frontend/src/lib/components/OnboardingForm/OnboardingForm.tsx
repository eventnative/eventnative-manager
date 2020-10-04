import * as React from 'react'
import {Project, SuggestedUserInfo, User} from "../../services/model";
import {Button, Col, Form, Input, message, Modal} from "antd";
import {LockOutlined, UserOutlined} from "@ant-design/icons/lib";
import {useState} from "react";
import ApplicationServices from "../../services/ApplicationServices";
import * as Utils from "../../commons/utils";
import {reloadPage} from "../../commons/utils";
import {handleError, makeErrorHandler} from "../components";
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error;

type State = {
    loading: boolean
}

type Props = {
    user: User
    visible: boolean
}


export default function OnboardingForm(props: Props) {
    let services = ApplicationServices.get();
    const [state, setState] = useState({
        loading: false
    })
    const [form] = Form.useForm();

    const onSubmit = async () => {
        setState({loading: true});
        try {
            let values = await form.validateFields();
            let user = services.userService.getUser();
            user.onboarded = true;
            user.projects = [new Project(
                Utils.randomId(),
                values['projectName']
            )];
            user.name = values['userDisplayName']
            await services.userService.update(user);
            await services.initializeDefaultDestination();
            reloadPage();
        } catch (e) {
            handleError(e, "Can't save project data");
        } finally {
            setState({loading: false})
        }
    }


    return (<Modal
        title="You're almost done! To finish registration, please tell us more about yourself and your company"
        visible={props.visible}
        closable={false}
        footer={[
            <Button key="cancel" onClick={() => {
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