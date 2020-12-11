import * as React from 'react'
import {LoadableComponent} from "../components";
import {jitsu} from "../../../generated/objects";
import ApplicationServices, {ObjectsPersistence} from "../../services/ApplicationServices";
import {AutoComplete, Button, Col, Modal, Row} from "antd";
import PlusOutlined from "@ant-design/icons/lib/icons/PlusOutlined";
import './SourcesListPage.less'
import Search from "antd/es/input/Search";
import {SOURCES, SourceType} from "./sources";
import {useState} from "react";
import DatabaseOutlined from "@ant-design/icons/lib/icons/DatabaseOutlined";

const githubLogo = require('../../../icons/button-pointer.svg');

type State = {
    sources: jitsu.AllSourcesConfiguration
    addNewSourceDialogVisible: boolean
}

export default class SourcesListPage extends LoadableComponent<any, State> {
    private services = ApplicationServices.get();
    private sourcesStorage: ObjectsPersistence<jitsu.AllSourcesConfiguration>;

    protected async load(): Promise<State> {
        this.sourcesStorage = this.services.persistenceService.of<jitsu.AllSourcesConfiguration>(jitsu.AllSourcesConfiguration);
        let sources = await this.sourcesStorage.get(this.services.activeProject.id);
        await this.sourcesStorage.save(this.services.activeProject.id, sources);
        return {
            sources: sources,
            addNewSourceDialogVisible: !sources.sources || sources.sources.length == 0
        }

    }

    protected renderReady(): React.ReactNode {
        return (<>
            <Button type="primary" onClick={() => this.addNewSource()} icon={<PlusOutlined/>}>Add source</Button>
            {(!this.state.sources.sources || this.state.sources.sources.length == 0) ? this.emptySources() : this.listSources()}
            {this.addNewSourceModal()}
        </>)
    }

    private listSources() {

    }

    private emptySources() {
        return <div className="src-config-empty-sources">
        </div>
    }



    private addNewSourceModal() {

        const mockVal = (str: string, repeat: number = 1) => {
            return {
                value: str.repeat(repeat),
            };
        };
        let option = {
            value: <b>Test</b>
        };
        return <Modal
            className="src-config-empty-sources"
            title="Add new source"
            visible={this.state.addNewSourceDialogVisible}
            keyboard={true}
            closable={true}
            onCancel={() => this.setState({addNewSourceDialogVisible: false})}
            footer={[
                <Button key="cancel" type="primary" onClick={() => this.setState({addNewSourceDialogVisible: false})}>Cancel</Button>
            ]}
        >
            <SearchSourceComponent onSelect={(val) => {alert(val)}} />

        </Modal>
    }

    private addNewSource() {

    }
}
function getIconSrc(srcTypeId: string): any {
    try {
        return require('../../../icons/src/' + srcTypeId + '.svg');
    } catch (e) {
        console.log("Icon for " + srcTypeId + " is not found")
        return null
    }
}

function getIcon(destinationType: string): any {
    let src = this.getIconSrc(destinationType);
    return src ? (<img src={src} className="destination-type-icon" alt="[destination]"/>) : <DatabaseOutlined/>;
}


function renderItem(item: SourceType, searchString?: string) {
    return <Row>
        <Col span={4}>

        </Col>
        <Col span={20} className="src-config-item">
            <h1>{item.name}</h1>
            <div>{item.comment}</div>
        </Col>
    </Row>

}

function SearchSourceComponent({onSelect} : {onSelect: (string) => void}) {
    const [value, setValue] = useState('');

    const [options, setOptions] = useState<{ value: any }[]>(Object.values(SOURCES).map(s => {return {value: renderItem(s)}}));
    return <AutoComplete
        onSelect={(val) => onSelect(val)}
        onSearch={(searchText: string) => {
            setOptions(
                !searchText ? [] : (Object.values(SOURCES)
                    .filter(s => s.id.toLowerCase().indexOf(searchText) >= 0 || s.name.toLowerCase().indexOf(searchText) >= 0 || s.comment.toLowerCase().indexOf(searchText) >= 0)
                    .map(s => {return {value: renderItem(s)}}))
            );
        }}
        className="src-config-empty-sources"
        dropdownMatchSelectWidth={500}
        options={options}
    >
        <Search size="large" placeholder="Start typing name of the source" />
    </AutoComplete>

}