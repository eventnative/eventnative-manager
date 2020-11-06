import React, {PureComponent, useState} from 'react';
import {LoadableComponent, StatCard} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {Button, Card, Col, Row} from "antd";
import './StatusPage.less'

import moment, {Moment, unitOfTime} from "moment";
import {isNullOrUndef, withDefaultVal} from "../../commons/utils";
import {NavLink} from "react-router-dom";
import ReloadOutlined from "@ant-design/icons/lib/icons/ReloadOutlined";
import {BarChart, LineChart, Line, Bar, Legend, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';

/**
 * Information about events per current period and prev
 * period
 */
class EventsComparison {
    current: number
    currentExtrapolated: number //if current isn't representing a full period (example, we're in the middle
    //of the hour), this value will contain extrapolated value. Currently not calculated, reserver for future use
    previous: number
    lastPeriod: Moment


    constructor(series: DatePoint[], granularity: Granularity) {
        if (series == null || series.length == 0) {
            this.current = this.previous = 0;
            this.lastPeriod = null;
        } else {
            this.current = series[series.length - 1].events;
            this.lastPeriod = series[series.length - 1].date
            this.previous = series.length > 1 ? series[series.length - 2].events : null;
        }
    }
}

type Granularity = "day" | "hour" | "total";


type State = {
    designationsCount?: number
    hourlyEvents?: DatePoint[]
    dailyEvents?: DatePoint[]
    hourlyComparison?: EventsComparison
    dailyComparison?: EventsComparison
}

interface Props {
    timeInUTC?: boolean
}

type DatePoint = {
    date: Moment
    events: number
}

interface StatService {
    get(from: Date, to: Date, granularity: Granularity): Promise<DatePoint[]>
}

function addSeconds(date: Date, seconds: number): Date {
    let res = new Date(date.getTime());
    res.setSeconds(res.getSeconds() + seconds)
    return res;
}

function roundDown(date: Date, granularity: Granularity): Date {
    let res = new Date(date);
    res.setMinutes(0, 0, 0);
    if (granularity == "day") {
        res.setHours(0);
    }
    return res;
}

function emptySeries(from: Moment, to: Moment, granularity: Granularity): DatePoint[] {
    let res: DatePoint[] = [];
    let end = moment(to).utc().startOf(granularity as unitOfTime.StartOf);
    let start = moment(from).utc().startOf(granularity as unitOfTime.StartOf);
    while (end.isSameOrAfter(start)) {
        res.push({date: moment(end), events: 0});
        end = end.subtract(1, granularity as unitOfTime.DurationConstructor)
    }
    return res;
}

function mergeSeries(lowPriority: DatePoint[], highPriority: DatePoint[]): DatePoint[] {
    return Object.entries({...index(lowPriority), ...index(highPriority)}).map(([key, val]) => {
        return {date: moment(key).utc(), events: val}
    }).sort((e1, e2) => {
        if (e1.date > e2.date) {
            return 1;
        } else if (e1.date < e2.date) {
            return -1;
        }
        return 0;
    });
}

function index(series: DatePoint[]): Record<string, number> {
    let res = {}
    series.forEach((point) => {
        res[point.date.toISOString()] = point.events;
    });
    return res;
}


class StatServiceImpl implements StatService {
    private readonly service: ApplicationServices
    private readonly timeInUTC: boolean;

    constructor(service: ApplicationServices, timeInUTC: boolean) {
        this.service = service
        this.timeInUTC = timeInUTC;
    }

    async get(from: Date, to: Date, granularity: Granularity): Promise<DatePoint[]> {
        let data = (await this.service.backendApiClient.get(`/statistics?project_id=${this.service.activeProject.id}&from=${from.toISOString()}&to=${to.toISOString()}&granularity=${granularity}`))['data'];
        return mergeSeries(
            emptySeries(moment(from).utc(), moment(to).utc(), granularity),
            data.map((el) => {
                return {date: this.timeInUTC ? moment(el.key).utc() : moment(el.key), events: el.events}
            })
        );
    }
}


export default class StatusPage extends LoadableComponent<Props, State> {
    private readonly services: ApplicationServices;
    private stats: StatService;
    private timeInUTC: boolean;

    constructor(props: Props, context: any) {
        super(props, context);
        this.timeInUTC = withDefaultVal(this.props.timeInUTC, true);
        this.services = ApplicationServices.get();
        this.stats = new StatServiceImpl(this.services, this.timeInUTC);
        this.state = {}
    }


    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
    }


    renderReady() {
        let utcPostfix = this.timeInUTC ? " [UTC]" : "";
        return <>
            <div className="status-and-events-panel">
                <NavLink to="/events_stream" className="status-and-events-panel-main">Recent Events</NavLink>
                <Button className="status-and-events-panel-reload" icon={<ReloadOutlined/>} onClick={() => {
                    this.reload();
                }}/>
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={8}>
                        <StatCard value={this.state.designationsCount} title="Total destinations" bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.dailyComparison.current} valuePrev={this.state.dailyComparison.previous}
                                  title={"Today"} bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.hourlyComparison.current} valuePrev={this.state.hourlyComparison.previous}
                                  title={(`Last hour (${moment().utc().format("HH:[00]")} UTC) `)} bordered={false}/>
                    </Col>
                </Row>
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={12}>
                        <Card title="Events last 30 days" bordered={false}>
                            <Chart data={this.state.dailyEvents} granularity={"day"}/>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="Events last 24 hours" bordered={false}>
                            <Chart data={this.state.hourlyEvents} granularity={"hour"}/>
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


    async load(): Promise<State> {
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

        return {
            designationsCount, hourlyEvents, dailyEvents,
            hourlyComparison: new EventsComparison(hourlyEvents, "hour"),
            dailyComparison: new EventsComparison(dailyEvents, "day")
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

const testData = [
    {name: "Page A", uv: 4000, pv: 2400, amt: 2400},
    {name: "Page B", uv: 3000, pv: 1398, amt: 2210},
    {name: "Page C", uv: 2000, pv: 9800, amt: 2290},
    {name: "Page D", uv: 2780, pv: 3908, amt: 2000},
    {name: "Page E", uv: 1890, pv: 4800, amt: 2181},
    {name: "Page F", uv: 2390, pv: 3800, amt: 2500},
    {name: "Page G", uv: 3490, pv: 4300, amt: 2100}
];

function CustomizedAxisTick(props) {

    return (
        <g transform={`translate(${props.x},${props.y})`}>
            <text x={0} y={0} dy={16} font-size="10" textAnchor="end" fill="black">{props.payload.value}</text>
        </g>
    );
}

const Chart = ({data, granularity}: { data: DatePoint[], granularity: "hour" | "day" }) => {
    return (
        <ResponsiveContainer width="100%" minHeight={300} minWidth={300}>
            <LineChart data={data.map((point) => {
                return {
                    label: granularity == "hour" ? point.date.format("HH:mm") : point.date.format("DD MMM"),
                    events: point.events
                }
            })}>
                <XAxis dataKey="label" tick={<CustomizedAxisTick />} />
                <YAxis tickFormatter={tick => {
                    return new Intl.NumberFormat('en').format(tick);
                }}/>
                <CartesianGrid strokeDasharray="3 3"/>
                <Tooltip formatter={(value) => new Intl.NumberFormat('en').format(value)}/>
                <Line type="monotone" dataKey="events" stroke="#044f64" activeDot={{r: 8}} strokeWidth={2}/>
            </LineChart></ResponsiveContainer>
    );
};

// function Chart({data, granularity}: { data: DatePoint[], granularity: "hour" | "day" }) {
//     return <ResponsiveContainer>
//         <LineChart data={data} >
//         <Line type="monotone" dataKey="events" stroke="#8884d8" />
//         <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
//         <XAxis dataKey="date" />
//         <YAxis />
//         <Tooltip />
//         </LineChart>
//     </ResponsiveContainer>
// }

