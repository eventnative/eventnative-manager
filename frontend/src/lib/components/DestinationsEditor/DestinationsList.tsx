import * as React from 'react'
import {BQConfig, ClickHouseConfig, DestinationConfig, PostgresConfig} from "../../services/destinations";
import {Avatar, Grid, Row, Tooltip} from "antd";
import {List, Button, Skeleton} from 'antd';
import {ReactNode} from "react";
import {PlusOutlined} from "@ant-design/icons/lib";

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
        return (<List.Item>
            {config.id}
        </List.Item>)
    }

    render() {
        return ([
            <Tooltip title="Add destination">
                <Button type="primary" icon={<PlusOutlined />}>Add destination</Button>
            </Tooltip>,
            <List className="destinations-list" itemLayout="horizontal">
                {this.state.destinations.map(this.destinationComponent)}
            </List>
        ]);
    }


}