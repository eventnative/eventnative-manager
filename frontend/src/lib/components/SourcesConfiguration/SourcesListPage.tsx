import * as React from 'react'
import {useState} from 'react'
import {LabelWithTooltip, LoadableComponent} from "../components";
import {jitsu} from "../../../generated/objects";
import ApplicationServices, {ObjectsPersistence} from "../../services/ApplicationServices";
import {AutoComplete, Button, Col, Form, Input, Row, Select} from "antd";
import PlusOutlined from "@ant-design/icons/lib/icons/PlusOutlined";
import './SourcesListPage.less'
import {SOURCES, SourceType} from "./sources";
import SearchOutlined from "@ant-design/icons/lib/icons/SearchOutlined";
import CloseOutlined from "@ant-design/icons/lib/icons/CloseOutlined";
import {NavLink} from 'react-router-dom';


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
            addNewSourceDialogVisible: false // !sources.sources || sources.sources.length == 0
        }

    }

    protected renderReady(): React.ReactNode {
        return (<>
            {this.state.addNewSourceDialogVisible ?
                <SearchSourceComponent onSelect={(element) => {
                    console.log(element);
                    this.services.navigate("/sources/new_" + element.id);
                }} onClose={() => this.setState({addNewSourceDialogVisible: false})}/> :
                <Button type="primary" onClick={() => this.setState({addNewSourceDialogVisible: true})} icon={<PlusOutlined/>}>Add source</Button>

            }
            {(!this.state.sources.sources || this.state.sources.sources.length == 0) ? this.emptySources() : this.listSources()}
        </>)
    }

    private listSources() {

    }

    private emptySources() {
        return <div className="src-config-empty-sources">
        </div>
    }

}

function getIconSrc(srcTypeId: string): any {
    try {
        return require('../../../icons/sources/' + srcTypeId + '.svg');
    } catch (e) {
        return require('../../../icons/sources/fallback.svg');
    }
}

function getIcon(srcTypeId: string): any {
    let src = getIconSrc(srcTypeId);
    return (<img src={src} className="destination-type-icon" alt="[destination]"/>);
}


function renderItem(item: SourceType, searchString?: string) {
    return <Row key={item.id}>
        <Col span={4} key="1" className="src-config-picture">
            {getIcon(item.id)}

        </Col>
        <Col span={20} key="2" className="src-config-item">
            <h1>{item.name}</h1>
            <div>{item.comment}</div>
        </Col>
    </Row>

}

function SearchSourceComponent({onSelect, onClose}: { onSelect: (string) => void, onClose?: () => void }) {
    const [value, setValue] = useState('');

    let allItems = Object.values(SOURCES).map(s => {
        return {value: renderItem(s), id: s.id}
    });
    const [options, setOptions] = useState<{ value: any }[]>(allItems);
    return <AutoComplete
        defaultOpen={true}
        onSelect={(val, option) => onSelect(option)}
        onSearch={(searchText: string) => {
            setOptions(
                !searchText ? allItems : (Object.values(SOURCES)
                    .filter(s => s.id.toLowerCase().indexOf(searchText) >= 0 || s.name.toLowerCase().indexOf(searchText) >= 0 || s.comment.toLowerCase().indexOf(searchText) >= 0)
                    .map(s => {
                        return {value: renderItem(s), id: s.id}
                    }))
            );
        }}
        className="src-config-empty-sources"
        options={options}
    >
        <Input
            prefix={<Button type="text" icon={<SearchOutlined/>}/>}
            suffix={<Button type="text" icon={<CloseOutlined/>} onClick={() => onClose()}/>}
            placeholder="Start typing name of the source"/>
    </AutoComplete>
}

