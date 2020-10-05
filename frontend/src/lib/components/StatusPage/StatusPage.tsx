import React, {ReactElement, ReactNode} from 'react';
import {CenteredSpin, handleError, StatCard} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {Simulate} from "react-dom/test-utils";
import {Card, Col, Row} from "antd";
import './StatusPage.less'

type State = {
    loading: boolean,
    designationsCount?: number,
    eventsStat?: Record<string, number>

}


export default class StatusPage extends React.Component<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: {}, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            loading: true
        }
    }


    render() {
        if (this.state.loading) {
            return <CenteredSpin/>;
        }
        return <><h3>{this.services.userService.getUser().name}, welcome to EventNative!</h3>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={8}>
                        <StatCard value={this.state.designationsCount} valuePrev={this.state.designationsCount*2} title="Total destinations" bordered={false} />
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.designationsCount} valuePrev={this.state.designationsCount/2} title="Events today" bordered={false} />
                    </Col>
                    <Col span={8}>
                        <Card title="Events last hour" bordered={false}>
                            {this.state.designationsCount}
                        </Card>
                    </Col>
                </Row>
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={12}>
                        <Card title="Events last 30 days" bordered={false}>
                            N/A
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="Events last 24 hours" bordered={false}>
                            N/A
                        </Card>
                    </Col>
                </Row>
            </div>

            {/*<Row gutter={20}>*/}
            {/*    <Col span={8}>*/}
            {/*        <Card title="Total destinations" bordered={false} style={{width: 300}}>*/}
            {/*            {this.state.designationsCount}*/}
            {/*        </Card>*/}
            {/*    </Col>*/}
            {/*    <Col span={8}>*/}
            {/*        <Card title="Events today" bordered={false} style={{width: 300}}>*/}
            {/*            {this.state.designationsCount}*/}
            {/*        </Card>*/}
            {/*    </Col>*/}
            {/*    <Col span={8}>*/}
            {/*        <Card title="Events last hour" bordered={false} style={{width: 300}}>*/}
            {/*            {this.state.designationsCount}*/}
            {/*        </Card>*/}
            {/*    </Col>*/}
            {/*</Row>*/}
            {/*<Row gutter={20}>*/}
            {/*    <Col span={12}>*/}
            {/*        <Card title="Events last 30 days" bordered={false} style={{width: 300}}>*/}
            {/*            {this.state.designationsCount}*/}
            {/*        </Card>*/}
            {/*    </Col>*/}
            {/*    <Col span={12}>*/}
            {/*        <Card title="Events last 24 hours" bordered={false} style={{width: 300}}>*/}
            {/*            {this.state.designationsCount}*/}
            {/*        </Card>*/}
            {/*    </Col>*/}
            {/*</Row>*/}
        </>


    }

    async componentDidMount() {
        try {
            this.setState({
                loading: false,
                designationsCount: await this.getNumberOfDestinations(),
                eventsStat: await this.getEventsByDay()
            })
        } catch (e) {
            handleError('Failed to load data from server', e);
        }

    }

    async getNumberOfDestinations() {
        let destinations = await this.services.storageService.get("destinations", this.services.activeProject.id);
        return destinations ? destinations.destinations.length : 0;
    }

    async getEventsByDay(): Promise<Record<string, number>> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this.modelEvents())
            }, 30)
        })
    }

    modelEvents(): Record<string, number> {
        let res: Record<string, number> = {};
        let start = new Date();
        for (let i = 0; i < 60; i++) {
            let d = new Date();
            d.setDate(start.getDate() - i);
            res[this.format(d)] = 3_000_000 + (Math.random() - 0.5) * 1_000_000
        }
        return res;
    }

    format(d: Date) {

        let month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;

        return [year, month, day].join('-');
    }
}