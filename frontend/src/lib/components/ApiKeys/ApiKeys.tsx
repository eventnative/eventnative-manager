import React from 'react';
import {Button, Form, Input, Layout, message, Space, Spin, Tag} from "antd";
import ApplicationServices from "../../services/ApplicationServices";
import {CopyTwoTone, MinusCircleOutlined, MinusCircleTwoTone, PlusOutlined} from "@ant-design/icons/lib";
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

type State = {
    lifecycle: PageLifecycle
    keys: Token[]
    inputVisible: Boolean,
    inputValue: string | number | readonly string[],
}

export default class ApiKeys extends React.Component<{}, State> {
    private readonly services: ApplicationServices;

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            lifecycle: PageLifecycle.LOADING,
            keys: [],
            inputVisible: false,
            inputValue: ''
        }
    }

    public componentDidMount() {
        this.services.apiKeyService.get()
            .then((auth: any) => {
                this.setState((state: State) => {
                    if (auth.exists === true && auth.data()) {
                        state.keys = auth.data()
                    }
                    state.lifecycle = PageLifecycle.DATA;
                }, () => this.forceUpdate())
            })
            .catch((error: any) => {
                this.setState((state: State) => {
                    state.lifecycle = PageLifecycle.ERROR
                }, () => this.forceUpdate())
            })
    }

    private saveApiKeys(payload: Token[]) {
        this.setState((state: State) => {
            state.lifecycle = PageLifecycle.LOADING
        }, () => this.forceUpdate())
        this.services.apiKeyService.save(payload)
            .then(() => {
                this.setState((state: State) => {
                    state.lifecycle = PageLifecycle.DATA
                    message.success('Keys have been saved!')
                }, () => this.forceUpdate())
            })
            .catch((error: any) => {
                this.setState((state: State) => {
                    state.lifecycle = PageLifecycle.DATA
                    message.error('Error saving keys: ' + error.toString())
                }, () => this.forceUpdate())
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

    showInput = () => {
        //this.setState({inputVisible: true}, () => this.input.focus());
    };

    handleInputChange = e => {
        this.setState({inputValue: e.target.value});
    };

    saveInputRef = input => {
        // this.state.input = input;
    };

    data() {
        return (
            <div className="api-keys-container">
                <Form name="dynamic_form_nest_item" initialValues={this.state.keys} onFinish={values => {
                    this.saveApiKeys(values)
                }} autoComplete="off">
                    <h2>Api Keys</h2>
                    <Form.List name="auth">
                        {(fields, {add, remove}) => {
                            return (
                                <div>
                                    {fields.map((field, index) => (
                                        <Space key={field.key} style={{display: 'flex', marginBottom: 8}} align="start">
                                            <Form.Item
                                                {...field}
                                                id={String(index)}
                                                name={[field.name, 'token']}
                                                fieldKey={[field.fieldKey, 'token']}
                                                rules={[{required: true, message: 'Missing key'}]}
                                            >
                                                <Input placeholder="Key" disabled={true}/>
                                            </Form.Item>
                                            <br/>
                                            <div style={{marginBottom: 16}}>
                                                {/*<TweenOneGroup
                                                    enter={{
                                                        scale: 0.8,
                                                        opacity: 0,
                                                        type: 'from',
                                                        duration: 100,
                                                        onComplete: e => {
                                                            e.target.style = '';
                                                        },
                                                    }}
                                                    leave={{opacity: 0, width: 0, scale: 0, duration: 200}}
                                                    appear={false}
                                                >*/}
                                                {this.state.keys[index].origins.map((origin, i) => {
                                                    return (
                                                        <span key={origin} style={{display: 'inline-block'}}>
                                                            <Tag
                                                                closable
                                                                onClose={e => {
                                                                    e.preventDefault();
                                                                    this.state.keys[index].origins.splice(i, 1)
                                                                }}
                                                            >
                                                                {origin}
                                                            </Tag>
                                                            </span>
                                                    );
                                                })}
                                                {/* </TweenOneGroup>*/}
                                            </div>
                                            {this.state.inputVisible && (
                                                <Input
                                                    ref={this.saveInputRef}
                                                    type="text"
                                                    size="small"
                                                    style={{width: 78}}
                                                    value={this.state.inputValue}
                                                    onChange={this.handleInputChange}
                                                    //onBlur={this.handleInputConfirm}
                                                    onPressEnter={() => {
                                                        if (this.state.inputValue && this.state.keys[index].origins.indexOf(this.state.inputValue.toString()) === -1) {
                                                            //this.state.keys.auth[index].origins.push() = [...this.state.keys.auth[index].origins, this.state.inputValue];
                                                            this.state.keys[index].origins.push('pppp')
                                                        }

                                                        this.setState({
                                                            inputVisible: false,
                                                            inputValue: '',
                                                        });
                                                    }}
                                                />
                                            )}
                                            {!this.state.inputVisible && (
                                                <Tag onClick={this.showInput} className="site-tag-plus">
                                                    <PlusOutlined/> New Tag
                                                </Tag>
                                            )}
                                            );

                                            <CopyTwoTone
                                                onClick={() => {
                                                    console.log(fields[index])
                                                    console.log([field.name, 'origins'])
                                                    message.success('Copied!')
                                                }}
                                            />
                                            <MinusCircleTwoTone twoToneColor={'red'}
                                                                onClick={() => {
                                                                    remove(field.name);
                                                                }}
                                            />

                                        </Space>
                                    ))}

                                    <Form.Item>
                                        <Button
                                            type="dashed"
                                            onClick={() => {
                                                add({token: uuid.v4()});
                                            }}
                                            block
                                        >
                                            <PlusOutlined/> Generate
                                        </Button>
                                    </Form.Item>
                                </div>
                            );
                        }}
                    </Form.List>

                    {/*<h2>S2S Api Keys</h2>
                    <Form.List name="s2s_auth">
                        {(fields, {add, remove}) => {
                            return (
                                <div>
                                    {fields.map((field, index) => (
                                        <Space key={field.key} style={{display: 'flex', marginBottom: 8}} align="start">
                                            <Form.Item
                                                {...field}
                                                id={String(index)}
                                                name={[field.name, 'token']}
                                                fieldKey={[field.fieldKey, 'token']}
                                                rules={[{required: true, message: 'Missing key'}]}
                                            >
                                                <Input placeholder="S2S Key" disabled={true}/>
                                            </Form.Item>

                                            <CopyTwoTone
                                                onClick={() => {
                                                    message.success('Copied!')
                                                }}
                                            />
                                            <MinusCircleTwoTone twoToneColor={'red'}
                                                                onClick={() => {
                                                                    remove(field.name);
                                                                }}
                                            />
                                        </Space>
                                    ))}

                                    <Form.Item>
                                        <Button
                                            type="dashed"
                                            onClick={() => {
                                                add({token: uuid.v4()});
                                            }}
                                            block
                                        >
                                            <PlusOutlined/> Generate
                                        </Button>
                                    </Form.Item>
                                </div>
                            );
                        }}
                    </Form.List>*/}

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Submit
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    }

    empty() {
        return (
            <h1>empty</h1>
        );
    }
}