import React, {ReactElement, ReactNode, useEffect, useState} from 'react';
import {Button, Col, Input, message, Modal, Row, Select, Space, Switch, Table, Tabs, Tooltip} from "antd";
import ApplicationServices from "../../services/ApplicationServices";
import {CodeFilled, DeleteFilled, PlusOutlined, RollbackOutlined, SaveOutlined} from "@ant-design/icons/lib";
import './ApiKeys.less'
import {Align, CenteredError, CenteredSpin, handleError, LabelWithTooltip, LoadableComponent} from "../components";
import {copyToClipboard, randomId} from "../../commons/utils";
import TagsInput from "../TagsInput/TagsInput";
import SyntaxHighlighter from 'react-syntax-highlighter';
import {docco} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {EVENTNATIVE_HOST, getCurlDocumentation, getEmpeddedJS, getNPMDocumentation} from "../../commons/api-documentation";

type Token = {
    uid: string
    jsAuth: string
    serverAuth: string
    origins?: string[]
    comment?: string
}

interface TokenDisplay extends Token {
    status: "deleted" | "modified" | "original"
}


type State = {
    loading: boolean
    tokens: TokenDisplay[]
}

export default class ApiKeys extends LoadableComponent<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            loading: false,
            tokens: [],
        };
    }

    protected async load(): Promise<State> {
        window.addEventListener("beforeunload", e => {
            if (this.state.tokens.find(tok => tok.status != "original")) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        let payload = await this.services.storageService.get("api_keys", this.services.activeProject.id)
        return {tokens: this.restoreTokesFromPayload(payload), loading: false}
    }

    private restoreTokesFromPayload(payload: any) {
        return payload ? payload.keys.map(t => {
            return {...t, status: "original"}
        }) : [];
    }

    protected renderReady() {
        let header = (<div className="api-keys-buttons-header">{this.generateButton()}{this.saveButton()}{this.cancelButton()}</div>)
        const columns = [
            {
                width: "250px", className: "api-keys-column-id", dataIndex: 'uid', key: 'uid', render: (text, row: TokenDisplay, index) => {
                    return <><span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <span className="api-keys-key-id">{text}</span>
                    </span>
                        {row.comment ? (<div className="api-keys-comment"><b>Note</b>: {row.comment}</div>) : ""}</>
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
                        <Space>
                            <ActionLink onClick={() => this.copyToClipboard(text)}>Copy To Clipboard</ActionLink>
                            <ActionLink onClick={() => {
                                this.state.tokens[index].jsAuth = this.newToken("js");
                                this.state.tokens[index].status = "modified";
                                this.forceUpdate();
                            }}>Generate New Key</ActionLink>
                        </Space>
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
                        <Space>
                            <ActionLink onClick={() => this.copyToClipboard(text)}>Copy To Clipboard</ActionLink>
                            <ActionLink onClick={() => {
                                this.state.tokens[index].serverAuth = this.newToken("s2s");
                                this.state.tokens[index].status = "modified";
                                this.forceUpdate();
                            }}>Generate New Key</ActionLink>
                        </Space>
                    </span>
                },
                title: (<LabelWithTooltip documentation={(<>Server API Key. Should be used with <a href="https://docs.eventnative.dev/api">backend API calls</a>.</>)}>Server Secret</LabelWithTooltip>)
            },
            {
                className: "api-keys-column-origins", dataIndex: 'origins', key: 'origins', render: (text, row, index) => {
                    return <span className={"api-keys-status-" + this.state.tokens[index].status}>
                        <TagsInput newButtonText="Add Origin" value={this.state.tokens[index].origins} onChange={(value) => {
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
                    return <>
                        <Tooltip trigger={["hover"]} title={"Show integration documentation"}>
                            <a style={{display: row.status === "deleted" ? "none" : "inline-block"}} onClick={async () => {

                                Modal.info({
                                    content: <KeyDocumentation token={row}/>,
                                    title: null,
                                    icon: null,
                                    className: "api-keys-documentation-modal"

                                })
                            }}>
                                <CodeFilled/>
                            </a>
                        </Tooltip>
                        <Tooltip trigger={["hover"]} title={row.status == "deleted" ? "Restore key" : "Delete key"}>
                            <a onClick={() => {
                                row.status = row.status == "deleted" ? "modified" : "deleted"
                                this.state.tokens[index] = row;
                                this.forceUpdate();
                            }}>
                                {row.status == "deleted" ? <RollbackOutlined/> : <DeleteFilled/>}
                            </a>
                        </Tooltip>
                    </>
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
        return (<Button type="primary" icon={<PlusOutlined/>} onClick={onClick}>Generate New Token</Button>)
    }

    cancelButton() {
        if (this.state.tokens.find(token => token.status != "original")) {
            return (<Button type="ghost" loading={this.state.loading} icon={<RollbackOutlined/>} onClick={() => this.reload()}>Rollback all changes</Button>)
        } else {
            return <></>
        }

    }

    saveButton() {
        let onClick = async () => {
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
            try {
                await this.services.storageService.save("api_keys", payload, this.services.activeProject.id);
                this.setState({tokens: this.restoreTokesFromPayload(payload), loading: false})
                message.success('Keys have been saved!')
            } catch (error) {
                this.setState({loading: false});
                handleError(error, 'Error saving keys');
            }
        }
        return (<Button type="primary" loading={this.state.loading} icon={<SaveOutlined/>} onClick={onClick}>Save</Button>)
    }

    copyToClipboard(value) {
        copyToClipboard(value);
        message.success("Key copied to clipboard")
    };


    private newToken(type: string, len?: number) {
        let postfix = `${this.services.activeProject.id}.${randomId(len)}`;
        return type.length > 0 ? `${type}.${postfix}` : postfix;
    }
}

function ActionLink({children, onClick}: { children: any, onClick: () => void }) {
    return (<div className="copy-to-clipboard-button" onClick={() => {
        onClick()
    }}><span>{children}</span></div>)
}

function KeyDocumentation({token}: { token: Token }) {
    const [gaEnabled, setGAEnabled] = useState(false);
    const [segment, setSegmentEnabled] = useState(false);
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null);
    const [domains, setDomains] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const services = ApplicationServices.get();

    useEffect(() => {
        services.storageService.get("custom_domains", services.activeProject.id)
            .then(result => {
                let newDomains = [...result.domains.map(domain => domain.name), EVENTNATIVE_HOST];
                setDomains(newDomains);
                setSelectedDomain(newDomains[0]);
            })
            .catch(e => setError(e))
            .finally(() => setLoading(false));
    });
    if (error) {
        handleError(error, "Failed to load data from server");
        return <CenteredError error={error}/>
    } else if (loading) {
        return <CenteredSpin/>
    }


    let exampleSwitches = <div className="api-keys-doc-embed-switches">
        <Space><LabelWithTooltip documentation={
            <>Check if you want to intercept events from Google Analytics
                (<a href="https://docs.eventnative.dev/javascript-reference">Read more</a>)
            </>}>Intercept GA events</LabelWithTooltip>
            <Switch size="small" checked={gaEnabled} onChange={() => setGAEnabled(!gaEnabled)}/>
            <LabelWithTooltip documentation={
                <>Check if you want to intercept events from Segment
                    (<a href="https://docs.eventnative.dev/javascript-reference">Read more</a>)
                </>}>Intercept Segment events</LabelWithTooltip>
            <Switch size="small" checked={segment} onChange={() => setSegmentEnabled(!segment)}/></Space>
    </div>


    return <Tabs className="api-keys-documentation-tabs" defaultActiveKey="1" tabBarExtraContent={(<>
        <LabelWithTooltip documentation="Domain">Domain</LabelWithTooltip>: <Select defaultValue={domains[0]} onChange={(value) => setSelectedDomain(value)}>
            {domains.map(domain => {return (<Select.Option value={domain}>{domain}</Select.Option>)})}
        </Select>
    </>)}>
        <Tabs.TabPane tab="Embed JavaScript" key="1">
            <p className="api-keys-documentation-tab-description">Easiest way to start tracking events within your web app is to
                add following snippet to <CodeInline>&lt;head&gt;</CodeInline>
                section of your html file. <a href="https://docs.eventnative.dev/javascript-reference">Read more</a> about JavaScript integration
                on our documentation website
            </p>
            <CodeSnippet language="javascript"
                         extra={exampleSwitches}>
                {getEmpeddedJS(segment, gaEnabled, token.jsAuth, selectedDomain)}
            </CodeSnippet>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Use NPM/YARN" key="2">
            <p className="api-keys-documentation-tab-description">
                Use <CodeInline>npm install --save @ksense/eventnative</CodeInline> or <CodeInline>yarn add @ksense/eventnative</CodeInline>.
                Read more <a href="https://docs.eventnative.dev/javascript-reference/direct-tracking">about configuration properties</a> and <a
                href="https://docs.eventnative.dev/javascript-reference/direct-tracking">tracking api</a>
            </p>
            <CodeSnippet language="javascript">
                {getNPMDocumentation(token.jsAuth, selectedDomain)}
            </CodeSnippet>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Server to server" key="3">
            Events can be send directly to API end-point. In that case, server secret should be used. Please, see curl example:
            <CodeSnippet language="bash">
                {getCurlDocumentation(token.serverAuth, selectedDomain)}
            </CodeSnippet>
        </Tabs.TabPane>
    </Tabs>
}

function CodeInline({children}) {
    return <span className="code-snippet-inline">{children}</span>
}

function CodeSnippet(props: { children: ReactNode, language: string, extra?: ReactNode }) {
    return <div className="code-snippet-wrapper">
        <SyntaxHighlighter language={props.language} style={docco}>{props.children}</SyntaxHighlighter>
        <Row><Col span={16}>
            {props.extra}
        </Col><Col span={8}>
            <Align horizontal="right">
                <ActionLink onClick={() => {
                    copyToClipboard(props.children);
                    message.info("Code copied to clipboard")
                }}>Copy To Clipboard</ActionLink>
            </Align>
        </Col></Row>

    </div>
}