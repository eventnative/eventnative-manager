import * as React from "react";
import {useState} from "react";
import ApplicationServices from "../../services/ApplicationServices";
import {Button, Form, Input, message, Modal, Table, Tag} from "antd";
import {
    CheckOutlined,
    ClockCircleOutlined,
    CloudOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    PlusOutlined,
    QuestionCircleOutlined,
    QuestionOutlined,
    RightCircleOutlined
} from "@ant-design/icons/lib";
import {CenteredSpin, handleError} from "../components";
import './CustomDomains.less'

const CNAME = "hosting.eventnative.com"

type Domain = {
    name: string
    status: "pending" | "verified"
    comment?: string
}

type State = {
    loading: boolean
    enterNameVisible: boolean
    domains: Domain[]
}

export class CustomDomains extends React.Component<any, State> {
    private services: ApplicationServices;


    constructor(props: Readonly<any>) {
        super(props);
        this.services = ApplicationServices.get();
        this.state = {
            loading: true,
            enterNameVisible: false,
            domains: []
        };
    }


    componentDidMount() {
        this.refreshDomains();
    }



    private refreshDomains() {
        this.services.storageService.get("custom_domains", this.services.activeProject.id).then((result) => {
            this.setState({
                domains: result ? result.domains : []
            })
        }).catch(handleError).finally(() => this.setState({loading: false}));
    }

    render() {
        if (this.state.loading) {
            return <CenteredSpin />
        }
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
                                let newDomains: Domain[] = this.state.domains.filter(element => element.name != domain.name);
                                this.setState({
                                    loading: true,
                                    domains: newDomains
                                });

                                this.services.storageService.save("custom_domains", {domains: newDomains}, this.services.activeProject.id).then(() => {
                                    message.success("Domain deleted!");
                                }).catch(handleError).finally(() => this.setState({loading: false}));
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

                let newDomains: Domain[] = [...this.state.domains, {name: text, status: "verified"}];
                this.setState({
                    loading: true,
                    domains: newDomains
                });

                this.services.storageService.save("custom_domains", {domains: newDomains}, this.services.activeProject.id).then(() => {
                    message.success("New domain added!");
                }).catch(handleError).finally(() => this.setState({loading: false}));
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