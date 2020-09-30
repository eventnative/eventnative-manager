import * as React from 'react'
import {ReactNode, useState} from 'react'
import {DestinationConfig, destinationConfigTypes, destinationsByTypeId, PostgresConfig} from "../../services/destinations";
import {Avatar, Button, Col, Dropdown, Form, Input, List, Menu, message, Modal, Radio, Row} from "antd";
import {DatabaseOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined} from "@ant-design/icons/lib";
import './DestinationEditor.less'
import {CenteredSpin, defaultErrorHandler} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {IndexedList} from "../../commons/utils";
import Marshal from "../../commons/marshalling";

type State = {
    loading: boolean
    destinations?: IndexedList<DestinationConfig>,
    activeEditorConfig?: DestinationConfig
}

export class DestinationsList extends React.Component<any, State> {
    private services: ApplicationServices;


    constructor(props: Readonly<any>) {
        super(props);
        this.services = ApplicationServices.get();
        this.state = {
            loading: true,
            destinations: this.newDestinationsList([])
        };
    }

    private newDestinationsList(items?: DestinationConfig[]) {
        let list = new IndexedList<DestinationConfig>((config: DestinationConfig) => config.id);
        items.forEach((item) => list.push(item));
        return list;
    }

    componentDidMount() {
        this.setState({loading: true});
        this.services.storageService.get("destinations", this.services.activeProject.id).then((destinations) => {
            this.setState({
                destinations: this.newDestinationsList(destinations ? Marshal.newArrayInstance(DestinationConfig, destinations.destinations) : []),
                loading: false
            });
        }).catch((error) => {
            defaultErrorHandler(error, "Failed to load data from server: ")
            this.setState({loading: false});
        })
    }

    destinationComponent(config: DestinationConfig): ReactNode {
        let onClick = () => this.delete(config);
        let onEdit = () => {
            let destinationType = destinationsByTypeId[config.type];
            if (dialogsByType[config.type]) {
                this.setState({
                    activeEditorConfig: config
                })
            } else {
                Modal.warning({
                    title: 'Not supported',
                    content: destinationType.name + ' destination is not supported yet',
                });
            }
        };
        return (<List.Item actions={[
            (<Button icon={<EditOutlined/>} shape="round" onClick={onEdit}>Edit</Button>),
            (<Button icon={<DeleteOutlined/>} shape="round" onClick={onClick}>Delete</Button>)
        ]} className="destination-list-item">
            <List.Item.Meta
                avatar={<Avatar shape="square" src={DestinationsList.getIconSrc(config.type)}/>}
                title={config.id}
                description={config.describe()}
            />
        </List.Item>)
    }

    private static getIconSrc(destinationType: string): any {
        try {
            return require('../../../icons/destinations/' + destinationType + '.svg').default;
        } catch (e) {
            console.log("Icon for " + destinationType + " is not found")
            return null
        }
    }

    static getIcon(destinationType: string): any {
        let src = this.getIconSrc(destinationType);
        return src ? (<img src={src} className="destination-type-icon"/>) : <DatabaseOutlined/>;
    }


    render() {
        if (this.state.loading) {
            return <CenteredSpin/>
        }

        let componentList = [
            <List className="destinations-list" itemLayout="horizontal" header={this.addButton()} split={true}>
                {this.state.destinations.toArray().map((config) => this.destinationComponent(config))}
            </List>
        ];


        if (this.state.activeEditorConfig) {
            componentList.push((<DestinationsEditorModal
                config={this.state.activeEditorConfig}
                onCancel={() => this.setState({activeEditorConfig: null})}
                testConnection={(values) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => resolve(values), 200);
                    })
                }}
                onSave={(formValues) => {
                    this.state.activeEditorConfig.update(formValues);
                    this.state.destinations.addOrUpdate(this.state.activeEditorConfig);
                    console.log("New destinations", this.state.destinations.toArray())
                    this.saveCurrentDestinations();
                }}
            />))
        }
        return componentList;
    }

    private saveCurrentDestinations() {
        this.services.storageService.save("destinations", {destinations: this.state.destinations.toArray()}, this.services.activeProject.id).then(() => {
            this.setState({
                destinations: this.state.destinations,
                activeEditorConfig: null
            });
            message.info("Destination configuration has been saved!")
        }).catch((error) => {
            Modal.error({title: "Save failed :(", content: error.message});
            console.log("Save failed", error)
        })
    }

    private addButton() {
        return (<Dropdown trigger={["click"]} overlay={this.addMenu()}>
            <Button type="primary" icon={<PlusOutlined/>}>Add destination</Button>
        </Dropdown>)
    }

    addMenu() {
        return (<Menu>
            {destinationConfigTypes.map(type => <Menu.Item onClick={() => this.addDestination(type.type)}>Add {type.name}</Menu.Item>)}
        </Menu>);
    }

    public delete(config: DestinationConfig) {
        Modal.confirm({
            title: 'Please confirm deletion of destination',
            icon: <ExclamationCircleOutlined/>,
            content: 'Are you sure you want to delete ' + config.id + ' destination?',
            okText: 'Delete',
            cancelText: 'Cancel',
            onOk: () => {
                this.state.destinations.remove(config.id)
                this.saveCurrentDestinations()
            },
            onCancel: () => {
            }
        });

    }

    private addDestination(type: string) {
        let destinationType = destinationsByTypeId[type];
        if (dialogsByType[type]) {
            this.setState({
                activeEditorConfig: destinationType.factory(this.pickId(type))
            })
        } else {
            Modal.warning({
                title: 'Not supported',
                content: destinationType.name + ' destination is not supported yet',
            });
        }
        return;
    }

    private pickId(type) {
        let id = type;
        let baseId = type
        let counter = 1
        while (this.state.destinations.toArray().find((el) => el.id == id) !== undefined) {
            id = baseId + counter
            counter++;
        }
        return id;
    }
}

type IDestinationDialogProps<T extends DestinationConfig> = {
    initialConfigValue: T
    form: any
}

type IDestinationDialogState<T extends DestinationConfig> = {
    currentValue: T
}


abstract class DestinationDialog<T extends DestinationConfig> extends React.Component<IDestinationDialogProps<T>, IDestinationDialogState<T>> {

    constructor(props: Readonly<IDestinationDialogProps<T>> | IDestinationDialogProps<T>) {
        super(props);
        this.state = {
            currentValue: props.initialConfigValue
        }
    }


    public render() {
        return (

            <Form layout="horizontal" form={this.props.form}>
                <Form.Item label="Mode" name="mode" labelCol={{span: 4}} wrapperCol={{span: 18}} initialValue={this.state.currentValue.mode}>
                    <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value="streaming">Streaming</Radio.Button>
                        <Radio.Button value="batch">Batch</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Table Name Pattern" name="tableName" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true} initialValue={this.state.currentValue.tableNamePattern}>
                    <Input type="text"/>
                </Form.Item>
                {this.items()}
            </Form>);
    }

    public getCurrentConfig(): T {
        return this.state.currentValue;
    }

    public abstract items(): ReactNode
}

type IDestinationEditorModalProps = {
    config: DestinationConfig
    onCancel: () => void
    onSave: (values: any) => void
    testConnection: (values: any) => Promise<any>

}

function DestinationsEditorModal({config, onCancel, onSave, testConnection}: IDestinationEditorModalProps) {
    let configType = destinationsByTypeId[(config as DestinationConfig).type];
    const [saving, setSaving] = useState(false)
    const [connectionTesting, setConnectionTesting] = useState(false)

    let title = (<h1 className="destination-modal-header">{DestinationsList.getIcon((config as DestinationConfig).type)}Edit {configType.name} connection</h1>);
    const [form] = Form.useForm();
    return (<Modal
        closable={true}
        keyboard={true}
        maskClosable={true}
        width="70%"
        className="destinations-editor-modal"
        title={title}
        visible={true}
        onCancel={onCancel}
        footer={[
            <Button className="destination-connection-test" loading={connectionTesting} onClick={() => {
                setConnectionTesting(true);
                form.validateFields().then((values) => {
                    testConnection(values).then(() => {
                        message.success("Successfully connected! " + JSON.stringify(values));
                    }).catch(error => {
                        defaultErrorHandler(error, "Failed to validate connection");
                    }).finally(() => setConnectionTesting(false));
                })
            }}>Test connection</Button>,
            <Button onClick={onCancel}>Close</Button>,
            <Button type="primary" loading={saving} onClick={() => {
                setSaving(true);
                form.validateFields().then(testConnection).then(values => {
                    onSave(values);
                }).catch(error => {
                    message.info("Failed to save connection " + error.message);
                    console.log("Error during saving connection", error);
                }).finally(() => setSaving(false));
            }}>Save</Button>,
        ]}
    >{React.createElement(dialogsByType[configType.type], {
        initialConfigValue: config,
        form: form
    })
    }</Modal>);

}

class PostgresDestinationDialog extends DestinationDialog<PostgresConfig> {


    constructor(props: Readonly<IDestinationDialogProps<PostgresConfig>> | IDestinationDialogProps<PostgresConfig>) {
        super(props);
    }

    items(): React.ReactNode {
        let config: PostgresConfig = this.state.currentValue;
        return (
            <span>
                <Row>
                    <Col span={16}>
                        <Form.Item initialValue={config.host} label="Host" name="pghost" labelCol={{span: 6}} wrapperCol={{span: 18}} rules={[{required: true, message: 'Host is required'}]}><Input type="text"/></Form.Item>
                    </Col>
                    <Col span={8}>
                    <Form.Item initialValue={config.port} label="Port" name="pgport" labelCol={{span: 6}} wrapperCol={{span: 6}} rules={[{required: true, message: 'Port is required'}]}>
                        <Input type="number"/>
                    </Form.Item>
                    </Col>
                </Row>
                    <Form.Item label="Database" initialValue={config.database} name="pgdatabase" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'DB is required'}]}>
                        <Input type="text"/>
                    </Form.Item>
                    <Form.Item label="Username" initialValue={config.user} name="pguser" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Username is required'}]}>
                        <Input type="text"/>
                    </Form.Item>
                    <Form.Item label="Password" initialValue={config.password} name="pgpassword" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Password is required'}]}>
                        <Input type="password"/>
                    </Form.Item>
            </span>);
    }
}

const dialogsByType = {
    'postgres': PostgresDestinationDialog
}
