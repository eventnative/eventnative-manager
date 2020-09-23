import React from 'react';
import {Button, Col, Input, List, Mentions, message, Row, Spin, Tag} from "antd";
import ApplicationServices from "../../services/ApplicationServices";
import {CopyTwoTone, MinusCircleTwoTone, PlusOutlined} from "@ant-design/icons/lib";
import TweenOneGroup from 'rc-tween-one'

import * as uuid from 'uuid';
import './ApiKeys.less'
import {GlobalError} from "../components";

enum PageLifecycle {
    LOADING, //Data is loading
    DATA, //Api keys
    ERROR //Error
}

type Token = {
    auth: string
    s2s_auth: string
    origins?: string[]
}

type Record = {
    token: Token

    inputOrigin: string
    inputVisible: boolean
}

type Payload = {
    records: Record[]
}

type State = {
    loading: boolean
    lifecycle: PageLifecycle
    payload: Payload
}

export default class ApiKeys extends React.Component<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            loading: false,
            lifecycle: PageLifecycle.LOADING,
            payload: {records: []} as Payload,
        }
    }

    public componentDidMount() {
        this.services.apiKeyService.get()
            .then((payload: any) => {
                if (payload.exists === true && payload.data() && payload.data().tokens) {
                    let records = payload.data().tokens.map(t => {
                        return {token: t, inputOrigin: '', inputVisible: false}
                    });
                    this.setState({
                        payload: {records: records}
                    })
                }
                this.setState({
                    lifecycle: PageLifecycle.DATA
                })
            })
            .catch((error: any) => {
                this.setState({lifecycle: PageLifecycle.ERROR})
            })
    }

    private saveApiKeys(payload: Payload) {
        this.setState({loading: true})
        this.services.apiKeyService.save({tokens: payload.records.map(t => t.token)})
            .then(() => {
                this.setState({lifecycle: PageLifecycle.DATA, loading: false})
                message.success('Keys have been saved!')
            })
            .catch((error: any) => {
                this.setState({lifecycle: PageLifecycle.DATA, loading: false})
                message.error('Error saving keys: ' + error.toString())
            })
    }

    render() {
        switch (this.state.lifecycle) {
            case PageLifecycle.DATA:
                return this.data();
            case PageLifecycle.ERROR:
                return (<GlobalError/>);
            case PageLifecycle.LOADING:
                return (<Spin/>);

        }
    }

    copyToClipboard = (value) => {
        const el = document.createElement('textarea');
        el.value = value;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };

    handleInputConfirm = (e, item, index) => {
        console.log(item)
        if (item.inputOrigin && item.token.origins.indexOf(item.inputOrigin) === -1) {
            item.token.origins.push(item.inputOrigin)
        }
        item.inputOrigin = ''
        item.inputVisible = false
        this.state.payload.records[index] = item
        this.setState({payload: this.state.payload})
    };


    data() {
        return (
            <div className="api-keys-container">
                <div className="api-keys-header">
                    <span style={{'fontSize': '18px'}}>API Keys</span>
                </div>
                <div className="api-keys-content">
                    <List
                        itemLayout="horizontal"
                        dataSource={this.state.payload.records}
                        renderItem={(item, index) => (
                            <List.Item>
                                <Row>
                                    <Col style={{marginRight: 10}}>
                                        Token: <Mentions value={item.token.auth} placeholder="Token" readOnly
                                                         style={{width: 350, marginRight: 5}}/>

                                        <CopyTwoTone
                                            style={{marginBottom: 10}}
                                            onClick={() => {
                                                this.copyToClipboard(item.token.auth)
                                                message.success('Copied!')
                                            }}
                                        />
                                    </Col>
                                    <Col style={{marginRight: 10}}>
                                        S2S Token: <Mentions value={item.token.s2s_auth} placeholder="S2S Token" readOnly
                                                             style={{width: 350, marginRight: 5}}/>

                                        <CopyTwoTone
                                            style={{marginRight: 5, marginBottom: 10}}
                                            onClick={() => {
                                                this.copyToClipboard(item.token.s2s_auth)
                                                message.success('Copied!')
                                            }}
                                        />
                                        <MinusCircleTwoTone
                                            style={{marginBottom: 10}}
                                            twoToneColor={'red'}
                                            onClick={() => {
                                                this.state.payload.records.splice(index, 1)
                                                this.setState({payload: this.state.payload})
                                            }}
                                        />
                                    </Col>
                                    <Col>
                                        <div style={{marginTop: 5}}>
                                            <TweenOneGroup>
                                                {(item.token.origins && (item.token.origins.map((origin, originIndex) => {
                                                    return (
                                                        <span key={origin}
                                                              style={{display: 'inline-block'}}>
                                                            <Tag
                                                                closable
                                                                onClose={e => {
                                                                    this.state.payload.records[index].token.origins.splice(originIndex, 1)
                                                                    this.setState({payload: this.state.payload})
                                                                }}
                                                            >
                                                             {origin}
                                                         </Tag>
                                                         </span>
                                                    );
                                                })))}
                                            </TweenOneGroup>
                                        </div>
                                        {item.inputVisible && (
                                            <Input
                                                id={"origin_input_" + index}
                                                type="text"
                                                size="small"
                                                style={{width: 78, marginRight: 5}}
                                                value={item.inputOrigin}
                                                onChange={e => {
                                                    this.state.payload.records[index].inputOrigin = e.target.value
                                                    this.setState({payload: this.state.payload})
                                                }}
                                                onBlur={e => {
                                                    this.handleInputConfirm(e, item, index)
                                                }}
                                                onPressEnter={e => {
                                                    this.handleInputConfirm(e, item, index)
                                                }}
                                            />
                                        )}
                                        {!item.inputVisible && (
                                            <Tag
                                                onClick={() => {
                                                    this.state.payload.records[index].inputVisible = true
                                                    this.setState({payload: this.state.payload})
                                                }}
                                                className="site-tag-plus">
                                                <PlusOutlined/> Add Origin
                                            </Tag>
                                        )}
                                    </Col>
                                </Row>
                            </List.Item>
                        )}
                    />
                </div>
                <div className="apikeys-action-buttons">
                    <Row>
                        <Button
                            type="dashed"
                            style={{width: 200}}
                            onClick={() => {
                                this.state.payload.records.push({token: {auth: uuid.v4(), s2s_auth: uuid.v4(), origins: []}, inputOrigin: '', inputVisible: false});
                                this.setState({payload: this.state.payload})
                            }}
                            block
                        >
                            <PlusOutlined/> Generate
                        </Button>
                        <Button type="primary" htmlType="submit" loading={this.state.loading}
                                onClick={() => this.saveApiKeys(this.state.payload)}>
                            Save
                        </Button>
                    </Row>
                </div>
            </div>
        );
    }

    empty() {
        return (
            <h1>empty</h1>
        );
    }
}