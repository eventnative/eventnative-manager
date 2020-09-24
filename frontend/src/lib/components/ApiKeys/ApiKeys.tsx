import React, {ReactNode} from 'react';
import {Button, Form, Input, List, Mentions, message, Modal, Tag, Tooltip} from "antd";
import ApplicationServices from "../../services/ApplicationServices";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SaveOutlined} from "@ant-design/icons/lib";
import './ApiKeys.less'
import {CenteredSpin, LabelWithTooltip} from "../components";
import * as uuid from 'uuid';

type Token = {
    auth: string
    s2s_auth: string
    origins?: string[]
}

type Record = {
    token: Token

    inputOrigin: string
    inputVisible: boolean
    inputRef: React.RefObject<any>
}

type Payload = {
    records: Record[]
}

type State = {
    globalLoading: boolean
    loading: boolean
    payload: Payload
}

export default class ApiKeys extends React.Component<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            globalLoading: true,
            loading: false,
            payload: {records: []} as Payload,
        };
    }

    public componentDidMount() {
        this.services.apiKeyService.get()
            .then((payload: any) => {
                if (payload.exists === true && payload.data() && payload.data().tokens) {
                    let records = payload.data().tokens.map(t => {
                        return {token: t, inputOrigin: '', inputVisible: false, inputRef: React.createRef()}
                    });
                    this.setState({payload: {records: records}})
                }
            })
            .catch(error => {
                message.error('Error loading api keys ' + error.message)
            })
            .finally(() => {
                this.setState({globalLoading: false})
            })
    }

    render() {
        if (this.state.globalLoading) {
            return <CenteredSpin/>
        }
        return ([
            <List className="destinations-list" itemLayout="horizontal"
                  header={[this.generateButton(), this.saveButton()]} split={true}>
                {this.state.payload.records.map((record, index) => this.tokenComponent(record, index))}
            </List>,
        ])
    }

    generateButton() {
        let onClick = () => {
            this.state.payload.records.push({
                token: {
                    auth: uuid.v4(),
                    s2s_auth: uuid.v4(),
                    origins: []
                }, inputOrigin: '', inputVisible: false, inputRef: React.createRef()
            });
            this.setState({payload: this.state.payload})

        }
        return (<Button type="primary" icon={<PlusOutlined/>} style={{marginRight: 20}} onClick={onClick}>Generate New Token</Button>)
    }

    saveButton() {
        let onClick = () => {
            this.setState({loading: true})
            this.services.apiKeyService.save({tokens: this.state.payload.records.map(t => t.token)})
                .then(() => {
                    message.success('Keys have been saved!')
                })
                .catch(error => {
                    message.error('Error saving keys: ' + error.message)
                }).finally(() => {
                this.setState({loading: false})
            })

        }
        return (<Button type="primary" icon={<SaveOutlined />} onClick={onClick}>Save</Button>)
    }

    copyToClipboard = (value) => {
        const el = document.createElement('textarea');
        el.value = value;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };

    tokenComponent(record: Record, index: number): ReactNode {
        let onClick = () => {
            Modal.confirm({
                title: 'Please confirm deletion of key',
                icon: <ExclamationCircleOutlined/>,
                content: 'Are you sure you want to delete selected key?',
                okText: 'Delete',
                cancelText: 'Cancel',
                onOk: () => {
                    this.state.payload.records.splice(index, 1)
                    this.setState({payload: this.state.payload})
                },
                onCancel: () => {
                }
            });
        };
        return (<List.Item actions={[
            (<Button icon={<DeleteOutlined/>} shape="round" onClick={onClick}>Delete</Button>),
        ]} className="api-keys-list-item" key={record.token.auth}>
            <List.Item.Meta
                title={this.tokenForm(record)}
                description={this.originsComponent(record, index)}
            />
        </List.Item>)
    }

    tokenForm(record: Record): ReactNode {
        return (<Form layout="inline">
            <Form.Item label={LabelWithTooltip({label: "Token", documentation: "Token for javascript integration."})}>
                <Mentions className="token-field" value={record.token.auth} placeholder="Token" readOnly/>
                <div className="copy-to-clipboard-button" onClick={() => {
                    this.copyToClipboard(record.token.auth)
                    message.success('Token copied!')
                }}>Copy to clipboard</div>
            </Form.Item>
            <Form.Item label={LabelWithTooltip({label: "S2S Token", documentation: "Token for server2server integration."})}>
                <Mentions className="token-field" value={record.token.s2s_auth} placeholder="S2S Token" readOnly/>
                <div className="copy-to-clipboard-button" onClick={() => {
                    this.copyToClipboard(record.token.s2s_auth)
                    message.success('S2S Token copied!')
                }}>Copy to clipboard</div>
            </Form.Item>
        </Form>)
    }

    originsComponent(record: Record, index: number): ReactNode {
        let onTagClose = (tagIndex: number) => {
            this.state.payload.records[index].token.origins.splice(tagIndex, 1);
            this.setState({payload: this.state.payload})
        };
        let onInputChange = e => {
            this.state.payload.records[index].inputOrigin = e.target.value
            this.setState({payload: this.state.payload})
        };
        let handleInputConfirm = e => {
            if (record.inputOrigin && record.token.origins.indexOf(record.inputOrigin) === -1) {
                record.token.origins.push(record.inputOrigin)
            }
            record.inputOrigin = '';
            record.inputVisible = false;
            this.state.payload.records[index] = record;
            this.setState({payload: this.state.payload})
        };
        let showInput = () => {
            this.state.payload.records[index].inputVisible = true
            this.setState({payload: this.state.payload}, () => this.state.payload.records[index].inputRef.current.focus())
        };
        return (
            <Form layout="inline">
                <Form.Item label={LabelWithTooltip({label: "Origins", documentation: "Allow access with tokens only for selected Origins. Allow access to all Origins if empty."})}>
                    {record.token.origins && (record.token.origins.map((originTag, oIndex) => {
                        const isLongTag = originTag.length > 20;

                        const tagElem = (
                            <Tag
                                key={originTag}
                                closable
                                onClose={() => onTagClose(oIndex)}
                            >
                            <span>
                                {isLongTag ? `${originTag.slice(0, 20)}...` : originTag}
                            </span>
                            </Tag>
                        );
                        return isLongTag ? (
                            <Tooltip title={originTag} key={originTag}>
                                {tagElem}
                            </Tooltip>
                        ) : (
                            tagElem
                        );
                    }))}
                    {record.inputVisible && (
                        <Input
                            ref={record.inputRef}
                            id={"origin_input_" + index}
                            type="text"
                            size="small"
                            className="tag-input"
                            value={this.state.payload.records[index].inputOrigin}
                            onChange={onInputChange}
                            onBlur={handleInputConfirm}
                            onPressEnter={handleInputConfirm}
                        />
                    )}
                    {!record.inputVisible && (
                        <Tag className="site-tag-plus" onClick={showInput}>
                            <PlusOutlined/> Origin
                        </Tag>
                    )}
                </Form.Item>
            </Form>
        )
    }
}