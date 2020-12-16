import * as React from 'react'
import {LabelWithTooltip, LoadableComponent} from "../components";
import {jitsu} from "../../../generated/objects";
import ApplicationServices from "../../services/ApplicationServices";
import {Form, Select, Tag} from "antd";
import './SourcesListPage.less'
import {randomId} from "../../commons/utils";
import {NavLink} from "react-router-dom";
import Editor, {ControlledEditor} from "@monaco-editor/react";


type State = {
    config: jitsu.ISourceConfiguration
}

export default class SourceEditor extends LoadableComponent<any, State> {
    private services = ApplicationServices.get();

    protected async load(): Promise<State> {
        let id = this.props.id;
        if (id.startsWith("new_")) {
            let type = id.substr("new_".length);
            id = randomId();
            return {
                config: {
                    id: id,
                    typeName: type,
                    destinationIds: [],
                    collections: [],
                    config: {}
                }
            };
        } else {
            let config = ((await this.services.persistenceService.of<jitsu.IAllSourcesConfiguration>(jitsu.AllSourcesConfiguration).get(this.services.activeProject.id)).sources || [])
                .find(s => s.id === id);
            return {config: config};
        }
    }

    protected renderReady(): React.ReactNode {
        return <JsonEditor object={this.state.config} onSave={(config) => {
            console.log("Save ", config);
        }}/>
    }

}

interface SourceEditorProps {
    object: jitsu.ISourceConfiguration
    onSave: (obj: jitsu.ISourceConfiguration) => void
}

interface SourceEditorState {
    allDestinations?: Destination[]
    selectedDestinations?: string[],
    config: any
}

type Destination = {
    name: string
    uid: string
}

function getTemplate(config, type: string) {
    if (!config || Object.keys(config).length === 0) {
        switch(type) {
            case "firebase": return new jitsu.FirebaseConfig();
            case "google_analytics": return new jitsu.GoogleAnalyticsConfig();
            case "google_play": return new jitsu.GooglePlayConfig();
            default: return {};
        }
    }
    return config;

}

abstract class SourceEditorBody<P extends SourceEditorProps, S extends SourceEditorState> extends LoadableComponent<P, S> {


    private services = ApplicationServices.get();


    protected async load(): Promise<S> {
        let destinations = (await this.services.persistenceService.of(Object, "destinations").get(this.services.activeProject.id))['destinations'].map(dst => {
            return {name: dst['_id'], uid: dst['_uid']}
        });
        return {
            allDestinations: destinations,
            selectedDestinations: [],
            config: getTemplate(this.props.object.config, this.props.object.typeName)
        } as S
    }

    renderReady() {

        let options = [];
        for (let destination of this.state.allDestinations) {
            let found = this.state.selectedDestinations.find((val) => val === destination.uid) === undefined;
            console.log(`Searching ${destination.uid} in ${this.state.selectedDestinations}: ${found}`)
            if (found) {
                options.push(<Select.Option value={destination.uid} key={destination.uid}>{destination.name}</Select.Option>)
            }
        }
        return <Form className="src-config-editor">
            <Form.Item label={<LabelWithTooltip documentation={<NavLink to="/destinations">Destinations</NavLink>}>Select Destinations</LabelWithTooltip>} name="destinations" labelCol={{span: 4}} wrapperCol={{span: 12}} required={true}>
                <Select  showArrow={true} mode="multiple" placeholder="Select destinations" onChange={(val => {
                    this.setState({
                        selectedDestinations: val as string[]
                    });
                })} tagRender={(props) => {
                    const {label, value, closable, onClose} = props;
                    return <Tag closable={closable} onClose={onClose} style={{marginRight: 3}}>
                        {this.state.allDestinations.find((dest) => dest.uid === value).name}
                    </Tag>
                }
                }>{options}</Select>
            </Form.Item>
            {this.configEditor()}
        </Form>;
    }

    abstract configEditor(): React.ReactNode;

}


class JsonEditor extends SourceEditorBody<SourceEditorProps, SourceEditorState> {
    configEditor(): React.ReactNode {
        return <Form.Item label={<LabelWithTooltip documentation={<NavLink to="/destinations">Destinations</NavLink>}>Configuration JSON</LabelWithTooltip>} name="config-json" labelCol={{span: 4}}
                          wrapperCol={{span: 12}} required={true}>
            <CodeInput initialValue={this.state.config} language="json" height="90vh"/>
        </Form.Item>
    }
}

type CodeInputProps = {
    height?: string
    language: string
    value?: string
    initialValue?: string
    className?: string
    onChange?: (val) => void

}

function CodeInput(props: CodeInputProps) {
    let cfg = JSON.stringify(props.value || props.initialValue || {}, null, 4);
    return <div className={"code-input-wrapper" + (props.className ? ` ${props.className}` : "")}>
        <ControlledEditor
            language={props.language}
            options={{
                minimap: {enabled: false},
                lineNumbers: 'off'
            }}
            value={cfg}
            theme="dark"
            onChange={(ev, value) => {
                props.onChange(value);
            }}
        /></div>
}