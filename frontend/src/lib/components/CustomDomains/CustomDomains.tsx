import * as React from "react";
import ApplicationServices from "../../services/ApplicationServices";
import {Button, Form, Input, message, Modal, Table, Tag} from "antd";
import {CheckOutlined, ClockCircleOutlined, CloudOutlined, DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, RightCircleOutlined} from "@ant-design/icons";
import {LoadableComponent} from "../components";
import './CustomDomains.less'
import {Domain} from "../../services/model";

const CNAME = "hosting.eventnative.com"

type State = {
    enterNameVisible: boolean
    domains: Domain[]
}

export class CustomDomains extends LoadableComponent<any, State> {
    private services: ApplicationServices;


    constructor(props: Readonly<any>, context) {
        super(props, context);
        this.services = ApplicationServices.get();
    }


    protected async load() {
        let result = await this.services.storageService.get("custom_domains", this.services.activeProject.id);
        return {
            domains: result ? result.domains : [],
            enterNameVisible: false
        }
    }




    renderReady() {
        const columns = [
            {
                title: 'Domain',
                dataIndex: 'name',
                key: 'name',
                render: (name) => {
                    return <><a href={"https://" + name}><RightCircleOutlined /> {name}</a>
                        <div className="custom-domains-comment">
                            Please, make sure that CNAME of the domain points to <u>{CNAME}</u>
                        </div>
                        <br /></>
                }
            },
            {
                width: "340px",
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status) => {
                    let icon = status == "verified" ? (<CheckOutlined/>) : (<ClockCircleOutlined />);
                    let tag = <Tag icon={icon} color={status == "verified" ? "green" : undefined} key={status}>
                        {status.toUpperCase()}
                    </Tag>;
                    let description = status == "verified" ? undefined : (<div className="custom-domain-verified-comments">
                        We will check that CNANE is set up correctly and SSL certificate is issued. Due to nature
                        of DNS protocol, it can take up to 48 hours. <a onClick={() => {}}>Force verification</a>
                    </div>)
                    return description ? (<>{tag}{description}</>) : tag;
                }
            },
            {
                width: "140px",
                title: 'Action',
                dataIndex: 'action',
                key: 'action',
                render: (_, domain: Domain, index) => {
                    return <Button icon={<DeleteOutlined/>} shape="round" onClick={() => {
                        Modal.confirm({
                            title: 'Please confirm deletion of the domain',
                            icon: <ExclamationCircleOutlined/>,
                            content: 'Are you sure you want to delete ' + name + ' domain?',
                            okText: 'Delete',
                            cancelText: 'Cancel',
                            onOk: () => {
                                this.reload(async () => {
                                    let newDomains: Domain[] = this.state.domains.filter(element => element.name != domain.name);
                                    await this.services.storageService.save("custom_domains", {domains: newDomains}, this.services.activeProject.id);
                                    message.success("Domain deleted!");
                                    return {
                                        domains: newDomains
                                    }
                                })
                            },
                            onCancel: () => {
                            }
                        });
                    }}>
                        Delete
                    </Button>
                }
            },
        ];
        return (<>
            <div className="custom-domains-buttons">
                <Button type="primary" icon={<PlusOutlined/>} onClick={() => {
                    this.setState({enterNameVisible: true});
                    this.forceUpdate();
                }}>Add New Domain</Button>
            </div>
            <Table pagination={false} className="custom-domains-table" columns={columns} dataSource={this.state.domains.map((domain) => {
                return {...domain, key: domain.name}
            })}/>
            {this.state.enterNameVisible ? <EnterNameModal onClose={() => this.setState({enterNameVisible: false})} onReady={(text) => {
                this.reload(async () => {
                    let newDomains: Domain[] = [...this.state.domains, {name: text, status: "pending"}];
                    await this.services.storageService.save("custom_domains", {domains: newDomains}, this.services.activeProject.id);
                    message.success("New domain added!");
                    return {
                        domains: newDomains
                    }
                })
            }}/> : <></>
            }
        </>);
    }

}

function EnterNameModal({onClose, onReady}: {
    onReady: (value: string) => void
    onClose: () => void
}) {
    let [form] = Form.useForm();
    let ok = () => {
        form.validateFields()
            .then((values) => {
                onReady(values['domain']);
                onClose();
            });
    };
    return <Modal
        title="Please input domain name"
        visible={true}
        closable={true}
        keyboard={true}
        onOk={ok}
        onCancel={() => onClose}
        footer={[
            <Button key="close" onClick={onClose}>Cancel</Button>,
            <Button key="submit" type="primary" onClick={ok}>Add</Button>,
        ]}>
        <Form form={form}>
            <Form.Item name="domain" rules={[{
                message: "Invalid domain name",
                validator(rule, value) {
                    if (value.length == 0) {
                        Promise.reject("Domain name can't be empty");
                    }
                    if (!/^[a-zA-Z0-9\\.]{2,}$/.test(value)) {
                        return Promise.reject('Invalid domain value');
                    }
                    return Promise.resolve();
                },

            }]}>
                <Input prefix={<CloudOutlined/>} placeholder="Domain name"/>
            </Form.Item>
        </Form>
    </Modal>
}