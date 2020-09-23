import * as React from 'react'
import {BQConfig, ClickHouseConfig, DestinationConfig, destinationConfigTypes, PostgresConfig} from "../../services/destinations";
import {Avatar, Dropdown, Grid, Menu, Row, Tooltip} from "antd";
import {List, Button, Skeleton} from 'antd';
import {ReactNode} from "react";
import {DeleteOutlined, EditOutlined, PlusOutlined, UserOutlined} from "@ant-design/icons/lib";
import './DestinationEditor.less'

type State = {
    loading: boolean
    destinations?: DestinationConfig[]
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
        return (<List.Item actions={[
            (<Button icon={<EditOutlined/>} shape="round">Edit</Button>),
            (<Button icon={<DeleteOutlined/>} shape="round">Delete</Button>),
        ]} className="destination-list-item">
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
        return ([
            <List className="destinations-list" itemLayout="horizontal"
                  header={this.addButton()} split={true}>
                {this.state.destinations.map(this.destinationComponent)}
            </List>
        ]);
    }

    private addButton() {
        return (<Dropdown trigger={["click"]} overlay={this.addMenu()}>
            <Button type="primary" icon={<PlusOutlined/>}>Add destination</Button>
        </Dropdown>)
    }

    addMenu() {
        return (<Menu>
            {destinationConfigTypes.map(type => <Menu.Item key={type.type}>Add {type.name}</Menu.Item>)}
        </Menu>);
    }


}