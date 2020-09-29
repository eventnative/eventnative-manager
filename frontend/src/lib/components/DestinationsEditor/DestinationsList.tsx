import * as React from 'react'
import {ComponentElement, ReactNode, RefObject, useState} from 'react'
import {BQConfig, ClickHouseConfig, DestinationConfig, DestinationConfigFactory, destinationConfigTypes, destinationsByTypeId, PostgresConfig} from "../../services/destinations";
import {Avatar, Button, Col, Dropdown, Form, Input, List, Menu, message, Modal, Radio, Row} from "antd";
import {DatabaseOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined} from "@ant-design/icons/lib";
import './DestinationEditor.less'
import {CenteredSpin} from "../components";
import {Project} from "../../services/model";
import * as Utils from "../../commons/utils";
import {reloadPage} from "../../commons/utils";
import ApplicationServices from "../../services/ApplicationServices";
import {Simulate} from "react-dom/test-utils";
import error = Simulate.error;

type State = {
    loading: boolean
    destinations?: DestinationConfig[],
    activeEditorConfig?: DestinationConfig
}

export class DestinationsList extends React.Component<any, State> {
    private services: ApplicationServices;


    constructor(props: Readonly<any>) {
        super(props);
        this.services = ApplicationServices.get();
        this.state = {
            loading: true,
            destinations: []
        };
    }

    componentDidMount() {
        this.setState({loading: true});
        this.services.storageService.get("destinations", this.services.activeProject.id).then((destinations) => {
            this.setState({destinations: destinations ? destinations : [], loading: false});
        }).catch((error) => {
            message.error("Failed to load data from server: " + error.message);
            this.setState({loading: false});
        })
    }

    destinationComponent(config: DestinationConfig): ReactNode {
        let onClick = () => this.delete(config);
        let onEdit = () => {
        };
        return (<List.Item actions={[
            (<Button icon={<EditOutlined/>} shape="round" onClick={onEdit}>Edit</Button>),
            (<Button icon={<DeleteOutlined/>} shape="round" onClick={onClick}>Delete</Button>)
        ]} className="destination-list-item">
            <List.Item.Meta
                avatar={<Avatar shape="square" src={DestinationsList.getIconSrc(config.type)}/>}
                title={config.id}
                description="Description"
            />
        </List.Item>)
    }

    private static getIconSrc(destinationType: string): any {
        try {
            return require('../../../icons/destinations/' + destinationType + '.svg');
        } catch (e) {
            console.log("Icon for " + destinationType + " is not found")
            return null
        }
    }

    static getIcon(destinationType: string): any {
        let src = this.getIconSrc(destinationType);
        return src ? (<img src={src} className="destination-type-icon"/>) : <DatabaseOutlined/>;
    }

    addIfNeeded(destinations: DestinationConfig[], activeEditorConfig: DestinationConfig) {
        if (!destinations.find(dest => dest.id === activeEditorConfig.id)) {
            destinations.push(activeEditorConfig);
        }
    }

    render() {
        if (this.state.loading) {
            return <CenteredSpin/>
        }

        let componentList = [
            <List className="destinations-list" itemLayout="horizontal" header={this.addButton()} split={true}>
                {this.state.destinations.map((config) => this.destinationComponent(config))}
            </List>
        ];


        if (this.state.activeEditorConfig) {
            componentList.push((<DestinationsEditorModal
                config={this.state.activeEditorConfig}
                onCancel={() => this.setState({activeEditorConfig: null})}
                testConnection={() => {
                    return null
                }}
                onSave={(formValues) => {
                    this.state.activeEditorConfig.update(formValues);
                    this.addIfNeeded(this.state.destinations, this.state.activeEditorConfig);
                    this.services.storageService.save("destinations", this.services.activeProject.id).then(() => {
                        this.setState({activeEditorConfig: null});
                        message.info("Saved!")
                    }).catch((error) => {
                        Modal.error({title: "Save failed :(", content: error.message});
                    })
                    this.setState({activeEditorConfig: null})
                }}
            />))
        }
        return componentList;
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
                this.setState({loading: true})
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
        return type;
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
                <Form.Item label="Mode" name="mode" labelCol={{span: 4}} wrapperCol={{span: 18}} initialValue="streaming">
                    <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value="streaming">Streaming</Radio.Button>
                        <Radio.Button value="batch">Batch</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Table Name Pattern" name="tableName" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true} initialValue="events">
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
    testConnection: (values: any) => Promise<boolean>

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
            <Button onClick={() => {
//                setConnectionTesting(true);
                // form.validateFields().then((values) => {
                //     return testConnection(values)
                // }).then((result) => {
                //     if (result)
                // })catch(())

            }}>Test connection</Button>,
            <Button onClick={onCancel}>Close</Button>,
            <Button type="primary" loading={saving} onClick={() => {
                setSaving(true);
                form.validateFields()
                    .then((values) => {
                        onSave(values)
                    }).catch((error) => {
                    Modal.error({
                        title: "Can't save config",
                        content: error.message
                    });
                    setSaving(false);
                })
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
        return (
            <span>
                <Row>
                    <Col span={16}>
                        <Form.Item label="Host" name="pghost" labelCol={{span: 6}} wrapperCol={{span: 18}} required={true}><Input type="text"/></Form.Item>
                    </Col>
                    <Col span={8}>
                    <Form.Item label="Port" name="pgport" labelCol={{span: 6}} wrapperCol={{span: 6}} required={true} initialValue={5432}>
                        <Input type="number"/>
                    </Form.Item>
                    </Col>
                </Row>
                    <Form.Item label="Database" name="pgdatabase" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true}>
                        <Input type="text"/>
                    </Form.Item>
                    <Form.Item label="Username" name="pguser" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true}>
                        <Input type="text"/>
                    </Form.Item>
                    <Form.Item label="Password" name="pgpassword" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true}>
                        <Input type="password"/>
                    </Form.Item>
            </span>);
    }
}

const dialogsByType = {
    'postgres': PostgresDestinationDialog
}
