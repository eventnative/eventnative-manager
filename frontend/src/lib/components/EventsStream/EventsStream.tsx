import {Align, CodeSnippet, LoadableComponent} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import {withDefaultVal} from "../../commons/utils";
import {Button, Collapse} from "antd";
import {NavLink} from "react-router-dom";
import React from "react";
import moment, {Moment} from "moment";
import CaretRightOutlined from "@ant-design/icons/lib/icons/CaretRightOutlined";
import './EventsSteam.less'
import {WithExtraHeaderComponentHook} from "../../../navigation";

type Event = {
    time: Moment
    data: any
}

type State = {
    events?: Event[]
}

export default class EventsStream extends LoadableComponent<WithExtraHeaderComponentHook, State> {
    private readonly services: ApplicationServices;
    private timeInUTC: boolean;

    constructor(props: any, context: any) {
        super(props, context);
        this.timeInUTC = withDefaultVal(undefined, true);
        this.services = ApplicationServices.get();
        this.state = {}
    }



    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        this.props.setExtraHeaderComponent(<>
            <Button type="primary"><NavLink to="/dashboard">View Status Dashboard</NavLink></Button>
        </>);
    }

    eventHeader(event: Event) {
        return <>
            <span className="events-stream-event-time">
                {event.time.utc().format()}
            </span>
            <span className="events-stream-event-preview">{JSON.stringify(event.data)}</span>
        </>
    }

    eventContent(event: Event) {
        return <CodeSnippet className="events-stream-full-json" language="json">
            {JSON.stringify(event.data, null, 2)}
        </CodeSnippet>
    }

    protected renderReady(): React.ReactNode {
        if (!this.state.events || this.state.events.length == 0) {
            return <Align horizontal="center">No Data</Align>
        }
        return <Collapse className="events-stream-events"
            bordered={false}
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        >

            {this.state.events.map((event: Event) => {
                return <Collapse.Panel className="events-stream-panel"
                                       header={this.eventHeader(event)}
                                       key={Math.random()}>
                    <p>{this.eventContent(event)}</p>
                </Collapse.Panel>
            })}
        </Collapse>
    }

    protected async load(): Promise<State> {
        let events: Event[] = (await this.services.backendApiClient.get(`events?project_id=${this.services.activeProject.id}&limit=100`))['events'].map(rawEvent => {
            return {time: moment(rawEvent['_timestamp']), data: rawEvent}
        });
        events.sort((e1: Event, e2: Event) => {
            if (e1.time.isAfter(e2.time)) {
                return -1;
            } else if (e2.time.isAfter(e1.time)) {
                return 1;
            }
            return 0;
        })
        return {events};
    }




}