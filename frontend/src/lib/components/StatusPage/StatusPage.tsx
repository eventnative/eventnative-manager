import React, {ReactElement, ReactNode} from 'react';
import {CenteredSpin, handleError, LoadableComponent, StatCard} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {Card, Col, Row} from "antd";
import './StatusPage.less'
import {Axis, Chart, Line, Point, Slider} from "bizcharts";
import {numberFormat} from "../../commons/utils";

type State = {
    designationsCount?: number
    hourlyEvents?: DatePoint[]
    dailyEvents?: DatePoint[]
    eventsLast24?: number,
    events48to24?: number,
    eventsLastFullHour?: number,
    eventsPrevHour?: number

}

type DatePoint = {
    date: Date
    events: number
}

interface StatService {
    get(from: Date, to: Date, granularity: "day" | "hour" | "total"): Promise<DatePoint[]>
}

function addSeconds(date: Date, seconds: number): Date {
    let res = new Date(date.getTime());
    res.setSeconds(res.getSeconds() + seconds)
    return res;
}

function roundDown(date: Date, granularity: "day" | "hour"): Date {
    let res = new Date(date);
    res.setMinutes(0, 0, 0);
    if (granularity == "day") {
        res.setHours(0);
    }
    return res;
}

function roundUp(date: Date, granularity: "day" | "hour"): Date {
    let res = new Date(date);
    res.setMinutes(59, 23, 999);
    if (granularity == "day") {
        res.setHours(23);
    }
    return res;
}

class StatServiceImpl implements StatService {
    private readonly service: ApplicationServices

    constructor(service: ApplicationServices) {
        this.service = service
    }

    async get(from: Date, to: Date, granularity: "day" | "hour" | "total"): Promise<DatePoint[]> {
        let data = (await this.service.backendApiClient.get(`/statistics?project_id=${this.service.activeProject.id}&from=${from.toISOString()}&to=${to.toISOString()}&granularity=${granularity}`))['data'];
        let dates = data.map((el) => {
            return {date: new Date(Date.parse(el.key)), events: el.events}
        });
        dates.sort((e1, e2) => {
            if (e1.date > e2.date) {
                return 1;
            } else if (e1.date < e2.date) {
                return -1;
            }
            return 0;
        })
        return dates;
    }
}


export default class StatusPage extends LoadableComponent<{}, State> {
    private readonly services: ApplicationServices;
    private stats: StatService;

    constructor(props: {}, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.stats = new StatServiceImpl(this.services);
        this.state = {}
    }


    renderReady() {
        return <><h3>{this.services.userService.getUser().name}, welcome to EventNative!</h3>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={8}>
                        <StatCard value={this.state.designationsCount} title="Total destinations" bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.eventsLast24} valuePrev={this.state.events48to24} title="Events today" bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.eventsLastFullHour} valuePrev={this.state.eventsPrevHour} title="Events this hour" bordered={false}/>
                    </Col>
                </Row>
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={12}>
                        <Card title="Events last 30 days" bordered={false}>
                            {this.chart(this.state.dailyEvents, "day")}
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="Events last 24 hours" bordered={false}>
                            {this.chart(this.state.hourlyEvents, "hour")}
                        </Card>
                    </Col>
                </Row>
            </div>
        </>
    }

    format(date: Date, granularity: "day" | "hour") {

        let base = this.formatDate(date);

        if (granularity === "day") {
            return base;
        } else {
            return base + " " + this.padZero(date.getHours()) + ":" + this.padZero(date.getMinutes())
        }
    }

    padZero(val: any) {
        let str = val + "";
        return str.length > 1 ? str : ("0" + str);
    }

    chart(data: DatePoint[], granularity: "day" | "hour") {


        let dataProcessed = data.map(element => {
            return {
                date: this.format(element.date, granularity),
                events: element.events
            }
        })

        return <Chart
            autoFit
            height={250}
            data={dataProcessed}>
            <Axis name="events" label={{formatter: (val) => numberFormat(val)}}/>
            <Line position="date*events"/>
        </Chart>


    }

    async load() {
        let now = new Date();
        let [
            hourlyEvents,
            dailyEvents,
            designationsCount
        ] = await Promise.all([
            this.stats.get(addSeconds(now, -24 * 60 * 60), now, "hour"),
            this.stats.get(addSeconds(now, -30 * 24 * 60 * 60), now, "day"),
            this.getNumberOfDestinations()
        ]);

        let eventsLast24 = dailyEvents.length > 0 ? dailyEvents[dailyEvents.length - 1].events : 0;
        let events48to24 = dailyEvents.length > 1 ? dailyEvents[dailyEvents.length - 2].events : 0;

        let eventsLastFullHour = hourlyEvents.length > 0 ? hourlyEvents[hourlyEvents.length - 1].events : 0;
        let eventsPrevHour = hourlyEvents.length > 1 ? hourlyEvents[hourlyEvents.length - 2].events : 0;
        return {
            designationsCount, hourlyEvents, dailyEvents,
            eventsLast24, events48to24, eventsLastFullHour, eventsPrevHour
        };
    }

    async getNumberOfDestinations() {
        let destinations = await this.services.storageService.get("destinations", this.services.activeProject.id);
        return destinations ? destinations.destinations.length : 0;
    }


    formatDate(d: Date) {

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