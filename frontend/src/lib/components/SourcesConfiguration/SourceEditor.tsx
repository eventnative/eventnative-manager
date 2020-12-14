import * as React from 'react'
import {Align, LoadableComponent} from "../components";
import {jitsu} from "../../../generated/objects";
import ApplicationServices, {ObjectsPersistence} from "../../services/ApplicationServices";
import {AutoComplete, Button, Col, Input, Modal, Row} from "antd";
import PlusOutlined from "@ant-design/icons/lib/icons/PlusOutlined";
import './SourcesListPage.less'
import './SourcesListPage.less'
import {randomId} from "../../commons/utils";


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
            return {config: {
                    id: id,
                    typeName: type,
                    destinationIds: [],
                    collections: [],
                    config: {}
                }};
        } else {
            let config = ((await this.services.persistenceService.of<jitsu.IAllSourcesConfiguration>(jitsu.AllSourcesConfiguration).get(this.services.activeProject.id)).sources || [])
                .find(s => s.id === id);
            return {config: config};
        }
    }

    protected renderReady(): React.ReactNode {
        return <h1>{this.state.config.typeName}</h1>
    }

}