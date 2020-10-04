import React, {ReactElement, ReactNode} from 'react';
import {Button, Col, Form, Input, List, Mentions, message, Modal, Row, Table, Tag, Tooltip} from "antd";
import ApplicationServices from "../../services/ApplicationServices";
import {DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, SaveOutlined} from "@ant-design/icons/lib";
import './ApiKeys.less'
import {CenteredSpin, handleError, LabelWithTooltip} from "../components";
import * as uuid from 'uuid';
import {randomId} from "../../commons/utils";
import TagsInput from "../TagsInput/TagsInput";

type Token = {
    uid: string
    jsAuth: string
    serverAuth: string
    origins?: string[]
}

interface TokenDisplay extends Token {
    status: "deleted" | "modified" | "original"
}


type State = {
    globalLoading: boolean
    loading: boolean
    tokens: TokenDisplay[]
}

export default class ApiKeys extends React.Component<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            globalLoading: true,
            loading: false,
            tokens: [],
        };
    }

    public componentDidMount() {
        window.addEventListener("beforeunload", e => {
            if (this.state.tokens.find(tok => tok.status != "original")) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        this.services.storageService.get("api_keys", this.services.activeProject.id)
            .then((payload: any) => {
                let tokens = this.restoreTokesFromPayload(payload);
                this.setState({tokens: tokens})
            })
            .catch(error => {
                handleError(error, 'Error loading api keys');
            })
            .finally(() => {
                this.setState({globalLoading: false})
            })
    }

    private restoreTokesFromPayload(payload: any) {
        return payload ? payload.keys.map(t => {
            return {...t, status: "original"}
        }) : [];
    }

    render() {
        if (this.state.globalLoading) {
            return <CenteredSpin/>
        }
        let header = (<div className="api-keys-buttons-header">{this.generateButton()}{this.saveButton()}</div>)
        const columns = [
            {
                width: "250px", className: "api-keys-column-id", dataIndex: 'uid', key: 'uid', render: (text, row, index) => {
                    return <span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <span className="api-keys-key-id">{text}</span>
                    </span>
                }, title: (<LabelWithTooltip documentation={"Unique ID of the key"}>ID</LabelWithTooltip>),
            },
            {
                width: "250px",
                className: "api-keys-column-js-auth",
                dataIndex: 'jsAuth',
                key: 'jsAuth',
                render: (text, row, index) => {
                    return <span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <Input className={"api-keys-key-input"} type="text" value={text}/>
                        <ActionLink onСlick={() => this.copyToClipboard(text)}>Copy To Clipboard</ActionLink>
                        <ActionLink onСlick={() => {
                            this.state.tokens[index].jsAuth = this.newToken("js");
                            this.state.tokens[index].status = "modified";
                            this.forceUpdate();
                        }}>Generate New Key</ActionLink>
                    </span>
                },
                title: (<LabelWithTooltip documentation={(<>Client API Key. Should be used with <a href="https://docs.eventnative.dev/javascript-reference">JS client</a>.</>)}>Client
                    Secret</LabelWithTooltip>)
            },
            {
                width: "250px",
                className: "api-keys-column-s2s-auth",
                dataIndex: 'serverAuth',
                key: 'serverAuth',
                render: (text, row, index) => {
                    return <span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <Input className="api-keys-key-input" type="text" value={text}/>
                        <ActionLink onСlick={() => this.copyToClipboard(text)}>Copy To Clipboard</ActionLink>
                        <ActionLink onСlick={() => {
                            this.state.tokens[index].serverAuth = this.newToken("s2s");
                            this.state.tokens[index].status = "modified";
                            this.forceUpdate();
                        }}>Generate New Key</ActionLink>
                    </span>
                },
                title: (<LabelWithTooltip documentation={(<>Server API Key. Should be used with <a href="https://docs.eventnative.dev/api">backend API calls</a>.</>)}>Server Secret</LabelWithTooltip>)
            },
            {
                className: "api-keys-column-origins", dataIndex: 'origins', key: 'origins', render: (text, row, index) => {
                    return <span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <TagsInput newButtonText="Add Origin" value={this.state.tokens[index].origins} onChange={(value) => {
                            console.log("VALUES: ", [...value])
                            this.state.tokens[index].status = "modified";
                            this.state.tokens[index].origins = [...value];
                            this.forceUpdate()
                        }}/>
                    </span>
                }, title: (<LabelWithTooltip documentation={(<>JavaScript origins. If set, only calls from those hosts will be accepted. Wildcards are supported as (*.abc.com). If
                    you want to whitelist domain abc.com and all subdomains, add abc.com and *.abc.com. If list is empty, traffic will be accepted from all domains</>)}>Origins</LabelWithTooltip>)
            },
            {
                width: "140px", className: "api-keys-column-actions", title: "Actions", dataIndex: 'actions', render: (text, row: TokenDisplay, index) => {
                    return <Button icon={<DeleteOutlined/>} shape="round" onClick={() => {
                        this.state.tokens[index]
                        row.status = row.status == "deleted" ? "modified" : "deleted"
                        this.state.tokens[index] = row;
                        this.forceUpdate();
                    }}>
                        {row.status == "deleted" ? "Restore" : "Delete"}
                    </Button>
                }
            }
        ]
        return <>
            {header}
            <Table pagination={false} className="api-keys-table" columns={columns} dataSource={this.state.tokens.map((t) => {
                return {...t, key: t.uid}
            })}/></>
    }

    private static keys(nodes: ReactElement[]): ReactElement[] {
        nodes.forEach((node, idx) => node.key = idx)
        return nodes;
    }

    generateButton() {
        let onClick = () => {
            this.state.tokens.push({
                uid: this.newToken("", 6),
                serverAuth: this.newToken("s2s"),
                jsAuth: this.newToken("js"),
                status: "modified",
                origins: []
            } as TokenDisplay);
            this.setState({tokens: this.state.tokens})

        }
        return (<Button type="primary" icon={<PlusOutlined/>} style={{marginRight: 20}} onClick={onClick}>Generate New Token</Button>)
    }

    saveButton() {
        let onClick = () => {
            this.setState({loading: true})
            let tokensToSave = this.state.tokens.map((token) => {
                let tokenToSave: Token = {...token};
                delete tokenToSave['status']
                if (token.status == "deleted") {
                    return null;
                } else {
                    return tokenToSave;
                }
            }).filter(el => el != null);
            let payload = {keys: tokensToSave};
            this.services.storageService.save("api_keys", payload, this.services.activeProject.id)
                .then(() => {
                    this.setState({tokens: this.restoreTokesFromPayload(payload)})
                    message.success('Keys have been saved!')
                })
                .catch(error => {
                    handleError(error, 'Error saving keys');
                }).finally(() => {
                this.setState({loading: false})
            })

        }
        return (<Button type="primary" loading={this.state.loading} icon={<SaveOutlined/>} onClick={onClick}>Save</Button>)
    }

    copyToClipboard(value) {
        const el = document.createElement('textarea');
        el.value = value;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        message.success("Key copied to clipboard")
    };


    private newToken(type: string, len?: number) {
        let postfix = `${this.services.activeProject.id}:${randomId(len)}`;
        return type.length > 0 ? `${type}:${postfix}` : postfix;
    }
}

function ActionLink({children, onСlick}: { children: any, onСlick: () => void }) {
    return (<div className="copy-to-clipboard-button" onClick={() => {
        onСlick()
    }}><span>{children}</span></div>)
}