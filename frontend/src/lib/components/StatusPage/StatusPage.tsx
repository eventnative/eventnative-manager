import React, {useState} from 'react';
import {LoadableComponent, StatCard} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {Button, Card, Col, Form, Radio, Row} from "antd";
import './StatusPage.less'

import {ChartContainer, ChartRow, Charts, LineChart, YAxis, Resizable} from "react-timeseries-charts";
import styler from "react-timeseries-charts/lib/js/styler"

import {TimeSeries} from "pondjs";
import moment, {Moment} from "moment";
import {isNullOrUndef, withDefaultVal} from "../../commons/utils";
import {Option} from "antd/es/mentions";
import {NavLink} from "react-router-dom";
import UnorderedListOutlined from "@ant-design/icons/lib/icons/UnorderedListOutlined";
import ReloadOutlined from "@ant-design/icons/lib/icons/ReloadOutlined";

/**
 * Information about events per current period and prev
 * period
 */
class EventsComparison  {
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


function roundUp(date: Date, granularity: Granularity): Date {
    let res = new Date(date);
    res.setMinutes(59, 23, 999);
    if (granularity == "day") {
        res.setHours(23);
    }
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
        let dates: DatePoint[] = data.map((el) => {
            return {date: this.timeInUTC ? moment(el.key).utc() : moment(el.key), events: el.events}
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

    getCardTitle(name: string, comparison: EventsComparison, format: string) {
        return isNullOrUndef(comparison.lastPeriod) ? name : `${name} (${comparison.lastPeriod.format(format)})`
    }


    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
    }



    renderReady() {
        let utcPostfix = this.timeInUTC ? " [UTC]" : "";
        return <>
            <div className="status-and-events-panel">
                <NavLink to="/events_stream" className="status-and-events-panel-main">Recent Events</NavLink>
                <Button className="status-and-events-panel-reload" icon={<ReloadOutlined />} onClick={() => {
                    this.reload();
                }} />
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={8}>
                        <StatCard value={this.state.designationsCount} title="Total destinations" bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.dailyComparison.current} valuePrev={this.state.dailyComparison.previous}
                                  title={this.getCardTitle("Last day", this.state.dailyComparison, "MMMM Do YYYY")} bordered={false}/>
                    </Col>
                    <Col span={8}>
                        <StatCard value={this.state.hourlyComparison.current} valuePrev={this.state.hourlyComparison.previous}
                                  title={this.getCardTitle("Last hour", this.state.hourlyComparison, `HH:mm${utcPostfix}`)} bordered={false}/>
                    </Col>
                </Row>
            </div>
            <div className="status-page-cards-row">
                <Row gutter={16}>
                    <Col span={12}>
                        <Card title="Events last 30 days" bordered={false}>
                            <Chart data={this.state.dailyEvents} granularity={"day"} />
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card title="Events last 24 hours" bordered={false}>
                            <Chart data={this.state.hourlyEvents} granularity={"hour"} />
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


function Chart({data, granularity}: {data: DatePoint[], granularity: "hour" | "day"}) {
    let [mouseover, setMouseover] = useState({x: null, y: null})
    const style = styler([
        {key: "events", color: "steelblue", width: 2},
    ]);
    if (data.length <= 1) {
        return <div className="status-page-empty-chart">
            <h3>No Data</h3><p>There're too few events to display on a chart</p>
        </div>
    }
    const timeseries = new TimeSeries({
        name: "Events per " + granularity,
        columns: ["time", "events"],
        utc: true,
        points: data.map(point => [point.date, point.events])
    });
    let vals = data.map(point => point.events);
    return <Resizable><ChartContainer
        timeRange={timeseries.timerange()}
        width={600}
        onMouseMove={(x, y) => setMouseover({x, y})}
        timeAxisStyle={{
            ticks: {
                stroke: "#AAA",
                opacity: 0.25,
                "stroke-dasharray": "1,1"
            }
        }}
        showGrid={true}
        onTrackerChanged={(tracker) => {
            if (!tracker) {
                setMouseover({x: null, y: null});
            }
        }}
    >
        <ChartRow height="300">
            <YAxis id="events" label={null} min={Math.min(...vals)} max={Math.max(...vals)} width="60" type="linear" format=",.0f"/>
            <Charts>
                <LineChart
                    axis="events"
                    series={timeseries}
                    columns={["events"]}
                    breakLine={false}
                    style={style}
                    interpolation="curveBasis"
                />
                <CrossHairs x={mouseover.x} y={mouseover.y} />
            </Charts>
        </ChartRow>
    </ChartContainer></Resizable>
}

class CrossHairs extends React.Component<any, {}> {
    render() {
        const { x, y } = this.props;
        if (x !== undefined && x !== null && y !== undefined && y !== null && x >=0 && y >= 0) {
            return (
                <g>
                    <line style={{pointerEvents: "none", stroke: "#ccc"}} x1={0} y1={y} x2={this.props.width} y2={y} />
                    <line style={{pointerEvents: "none", stroke: "#ccc"}} x1={x} y1={0} x2={x} y2={this.props.height} />
                </g>
            );
        } else {
            return <g />;
        }
    }
}