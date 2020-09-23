import * as React from 'react'
import {BQConfig, ClickHouseConfig, DestinationConfig, destinationConfigTypes, destinationsByTypeId, PostgresConfig} from "../../services/destinations";
import {Avatar, Dropdown, Grid, Menu, message, Modal, Row, Spin, Tooltip} from "antd";
import {List, Button, Skeleton} from 'antd';
import {ReactNode} from "react";
import {DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons/lib";
import './DestinationEditor.less'
import {CenteredSpin} from "../components";
import {reloadPage} from "../../commons/utils";

type State = {
    loading: boolean
    destinations?: DestinationConfig[],
    editorComponent?: ReactNode
    editorHeader?: string
}

export class DestinationsList extends React.Component<any, State> {


    constructor(props: Readonly<any>) {
        super(props);
        this.state = {
            loading: true,
            destinations: []
        };
    }

    componentDidMount() {
        this.setState({
            loading: false,
            destinations: [new PostgresConfig("postgres-hobby"), new ClickHouseConfig("postgres-hobby"), new BQConfig("bq-test")]
        })
    }

    destinationComponent(config: DestinationConfig): ReactNode {
        let onClick = () => this.delete(config);
        let onEdit = () => this.edit(config);
        return (<List.Item actions={[
            (<Button icon={<EditOutlined/>} shape="round" onClick={onEdit}>Edit</Button>),
            (<Button icon={<DeleteOutlined/>} shape="round" onClick={onClick}>Delete</Button>),
        ]} className="destination-list-item" key={config.id}>
            <List.Item.Meta
                avatar={<Avatar shape="square" src={DestinationsList.getIcon(config)}/>}
                title={config.id}
                description="Description"
            />
        </List.Item>)
    }

    private static getIcon(config: DestinationConfig): any {
        try {
            return require('../../../icons/destinations/' + config.type + '.svg');
        } catch (e) {
            console.log("Icon for " + config.type + " is not found")
            return null
        }

    }

    render() {
        if (this.state.loading) {
            return <CenteredSpin/>
        }
        return ([
            <List className="destinations-list" itemLayout="horizontal"
                  header={this.addButton()} split={true}>
                {this.state.destinations.map((config) => this.destinationComponent(config))}
            </List>,
            this.editorComponent()
        ]);
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


    public edit(config: DestinationConfig) {
        this.setState({
            editorHeader: "Edit " + destinationsByTypeId[config.type].name + " connection",
            editorComponent: (<h1>Edit {destinationsByTypeId[config.type].name}</h1>)
        })
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
        this.setState({
            editorHeader: "Add " + destinationsByTypeId[type].name + " connection",
            editorComponent: (<h1>Edit {destinationsByTypeId[type].name}</h1>)
        })

    }

    public editorComponent() {
        return (<Modal
            title={this.state.editorHeader}
            visible={this.state.editorComponent != null}
            closable={false}
            footer={[
                <Button key="submit" onClick={() => {this.setState({editorComponent: null})}}>Close</Button>,
                <Button key="submit" type="primary" loading={false} onClick={() => {}}>Save</Button>,
            ]}
        >{this.state.editorComponent}</Modal>);
    }

}