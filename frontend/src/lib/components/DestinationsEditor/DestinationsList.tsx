import * as React from 'react'
import {ReactNode, useState} from 'react'
import {ClickHouseConfig, DestinationConfig, destinationConfigTypes, destinationsByTypeId, PostgresConfig, RedshiftConfig} from "../../services/destinations";
import {Avatar, Button, Col, Divider, Dropdown, Form, Input, List, Menu, message, Modal, Radio, Row, Select, Switch} from "antd";
import {DatabaseOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined} from "@ant-design/icons/lib";
import './DestinationEditor.less'
import {CenteredSpin, handleError, LabelWithTooltip, LoadableComponent} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {IndexedList} from "../../commons/utils";
import Marshal from "../../commons/marshalling";
import {Option} from "antd/es/mentions";

const AWS_ZONES = [
    "us-east-2",
    "us-east-1",
    "us-west-1",
    "us-west-2",
    "ap-south-1",
    "ap-northeast-3",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "cn-north-1",
    "cn-northwest-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-west-3",
    "eu-north-1",
    "me-south-1",
    "sa-east-1",
    "us-gov-east-1",
    "us-gov-west-1"
];

type State = {
    destinations?: IndexedList<DestinationConfig>,
    activeEditorConfig?: DestinationConfig
}

export class DestinationsList extends LoadableComponent<any, State> {
    private services: ApplicationServices;


    constructor(props: Readonly<any>, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
    }

    private newDestinationsList(items?: DestinationConfig[]) {
        let list = new IndexedList<DestinationConfig>((config: DestinationConfig) => config.id);
        items.forEach((item) => list.push(item));
        return list;
    }

    protected async load() {
        let destinations = await this.services.storageService.get("destinations", this.services.activeProject.id);
        return {
            destinations: this.newDestinationsList(destinations ? Marshal.newInstance(destinations.destinations, [DestinationConfig, PostgresConfig, ClickHouseConfig, RedshiftConfig]) : []),
            loading: false
        }
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


    renderReady() {

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
            handleError(error, 'Save failed :(');
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
            <Form layout="horizontal" form={this.props.form} initialValues={this.state.currentValue.formData}>
                <Form.Item label="Mode" name="mode" labelCol={{span: 4}} wrapperCol={{span: 18}}>
                    <Radio.Group optionType="button" buttonStyle="solid" onChange={() => this.refreshStateFromForm()}>
                        <Radio.Button value="stream">Streaming</Radio.Button>
                        <Radio.Button value="batch">Batch</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Table Name Pattern" name="tableName" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true}>
                    <Input type="text"/>
                </Form.Item>
                {this.items()}
            </Form>);
    }

    public getCurrentConfig(): T {
        return this.state.currentValue;
    }

    public abstract items(): ReactNode

    public refreshStateFromForm() {
        this.state.currentValue.update(this.props.form.getFieldsValue());
        this.forceUpdate()
    }
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
                form
                    .validateFields().then((values) => {
                    testConnection(values).then(() => {
                        message.success("Successfully connected! " + JSON.stringify(values));
                    }).catch(error => {
                        handleError(error, "Failed to validate connection");
                    }).finally(() => setConnectionTesting(false));
                })
            }}>Test connection</Button>,
            <Button onClick={onCancel}>Close</Button>,
            <Button type="primary" loading={saving} onClick={() => {
                setSaving(true);
                form.validateFields().then(testConnection).then(values => {
                    onSave(values);
                }).catch(error => {
                    handleError(error, "Failed to save connection ");
                }).finally(() => setSaving(false));
            }}>Save</Button>,
        ]}
    >{React.createElement(dialogsByType[configType.type], {
        initialConfigValue: config,
        form: form
    })
    }</Modal>);

}

class ClickHouseDialog extends DestinationDialog<PostgresConfig> {
    items(): React.ReactNode {
        let dsnDocs = (<>Comma separated list of data sources names (DSNs). See <a href='https://github.com/ClickHouse/clickhouse-go#dsn'>documentation</a></>);
        let clusterDoc = (<>Cluster name. See <a href='https://github.com/ClickHouse/clickhouse-go#dsn'>documentation</a></>);
        let databaseDoc = (<>Database name. See <a href='https://github.com/ClickHouse/clickhouse-go#dsn'>documentation</a></>);

        return (
            <>
                <Row>
                    <Col span={16}>
                        <Form.Item label={<LabelWithTooltip documentation={dsnDocs}>Datasources Names (DSNs)</LabelWithTooltip>} name="ch_dsns"
                                   rules={[{required: true, message: 'Host is required'}]}
                                   labelCol={{span: 6}}
                                   wrapperCol={{span: 18}}><Input type="text"/></Form.Item>
                    </Col>
                </Row>
                <Form.Item label={<LabelWithTooltip documentation={clusterDoc}>Cluster</LabelWithTooltip>}
                           rules={[{required: true, message: 'Cluster name is required'}]}
                           name="ch_cluster" labelCol={{span: 4}} wrapperCol={{span: 12}}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item
                    label={<LabelWithTooltip documentation={databaseDoc}>Database</LabelWithTooltip>} rules={[{required: true, message: 'DB is required'}]}
                    name="ch_database" labelCol={{span: 4}} wrapperCol={{span: 12}}>
                    <Input type="text"/>
                </Form.Item>
            </>);
    }

}


class PostgresDestinationDialog extends DestinationDialog<PostgresConfig> {

    constructor(props: Readonly<IDestinationDialogProps<PostgresConfig>> | IDestinationDialogProps<PostgresConfig>) {
        super(props);
    }

    items(): React.ReactNode {
        return (
            <>
                <Row>
                    <Col span={16}>
                        <Form.Item label="Host" name="pghost" labelCol={{span: 6}} wrapperCol={{span: 18}} rules={[{required: true, message: 'Host is required'}]}><Input type="text"/></Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Port" name="pgport" labelCol={{span: 6}} wrapperCol={{span: 6}} rules={[{required: true, message: 'Port is required'}]}>
                            <Input type="number"/>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Schema" name="pgschema" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Schema is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Database" name="pgdatabase" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'DB is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Username" name="pguser" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Username is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Password" name="pgpassword" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Password is required'}]}>
                    <Input type="password"/>
                </Form.Item>
            </>);
    }
}

class RedshiftDestinationDialog extends DestinationDialog<RedshiftConfig> {

    s3CredentialsEnabled() {
        return !this.state.currentValue.formData['redshiftUseHostedS3'] && this.state.currentValue.formData['mode'] === "batch";
    }

    s3ConfigEnabled() {
        return this.state.currentValue.formData['mode'] === "batch";
    }

    items(): React.ReactNode {
        let s3Doc = (<>
            If the switch is enabled internal S3 bucket will be used. You won't be able to see raw logs. However, the data will be streamed to RedShift as-is.
            You still need to choose a S3 region which is most close to your redshift server
            to get the best performance
        </>);
        return (
            <>
                <Row>
                    <Col span={16}>
                        <Form.Item label="Host" name="redhsiftHost" labelCol={{span: 6}} wrapperCol={{span: 18}} rules={[{required: true, message: 'Host is required'}]}><Input
                            type="text"/></Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Database" name="redshiftDB" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'DB is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Schema" name="redshiftSchema" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Schema is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Username" name="redshiftUser" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Username is required'}]}>
                    <Input type="text"/>
                </Form.Item>
                <Form.Item label="Password" name="redshiftPassword" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: true, message: 'Password is required'}]}>
                    <Input type="password"/>
                </Form.Item>
                <Divider plain>
                    <LabelWithTooltip documentation={(<>If destination is working in batch mode (read about modes differences here), intermediate
                    batches is stored on S3. You need tp provide S3 credentials. You can use S3 hosted by us as well, just switch off 'Use hosted S3 bucket' setting</>)}>
                        S3 configuration
                    </LabelWithTooltip>
                </Divider>
                <Row>
                    <Col span={16}>
                        <Form.Item label="S3 Region" name="redshiftS3Region" labelCol={{span: 6}} wrapperCol={{span: 18}} rules={[{required: this.s3ConfigEnabled(), message: 'DB is required'}]}>
                            <Select disabled={!this.s3ConfigEnabled()}>
                                {AWS_ZONES.map(zone => (<Option value={zone}>{zone}</Option>))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label={<LabelWithTooltip documentation={s3Doc}>Use hosted S3 bucket</LabelWithTooltip>} name="redshiftUseHostedS3" labelCol={{span: 16}} wrapperCol={{span: 8}} rules={[{required: this.s3ConfigEnabled(), message: 'Required'}]}>
                            <Switch disabled={!this.s3ConfigEnabled()} onChange={() => this.refreshStateFromForm()} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="S3 Bucket" name="redshiftS3Bucket" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: this.s3CredentialsEnabled(), message: 'S3 Bucket is required'}]}>
                    <Input type="text" disabled={!this.s3CredentialsEnabled()}/>
                </Form.Item>

                <Form.Item label="S3 Access Key" name="redshiftS3AccessKey" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: this.s3CredentialsEnabled(), message: 'S3 Access Key is required'}]}>
                    <Input type="text" disabled={!this.s3CredentialsEnabled()}/>
                </Form.Item>
                <Form.Item label="S3 Secret Key" name="redshiftS3SecretKey" labelCol={{span: 4}} wrapperCol={{span: 12}} rules={[{required: this.s3CredentialsEnabled(), message: 'S3 Secret Key is required'}]}>
                    <Input type="password" disabled={!this.s3CredentialsEnabled()}/>
                </Form.Item>

            </>);
    }
}


const dialogsByType = {
    'postgres': PostgresDestinationDialog,
    'clickhouse': ClickHouseDialog,
    'redshift': RedshiftDestinationDialog
}
