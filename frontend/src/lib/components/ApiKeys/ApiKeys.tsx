import React from 'react';
import {Spin} from "antd";
import {Card} from 'antd';
import {DeleteOutlined} from '@ant-design/icons';
import ApplicationServices from "../../services/ApplicationServices";
import * as firebase from "firebase";
import {ApiKeyService} from "../../services/ApiKeyService";

enum PageLifecycle {
    LOADING, //Data is loading
    EMPTY, //Empty api keys
    DATA, //Api keys
    ERROR //Error
}

type Token = {
    token: string
    origins?: string[]
}

type KeysPayload = {
    auth: Token[]
    s2s_auth: Token[]
}

type AppState = {
    lifecycle: PageLifecycle
    keys: KeysPayload
}

export default class ApiKeys extends React.Component<{}, AppState> {
    private readonly apiKeyService: ApiKeyService

    constructor(props: any, context: any) {
        super(props, context);
        this.services = ApplicationServices.get();
        this.state = {
            lifecycle: PageLifecycle.LOADING,
            keys: {} as KeysPayload
        }
    }

    public componentDidMount() {
        this.services.firebase.firestore().collection('en_auth').doc(firebase.auth().currentUser.uid).get()
            .then((auth: any) => {
                this.setState((state: AppState) => {
                    if (auth.exists && (auth.data().auth !== [] || auth.data().s2s_auth !== [])) {
                        state.lifecycle = PageLifecycle.DATA;
                        state.keys.auth = auth.data().auth
                        state.keys.s2s_auth = auth.data().s2s_auth
                    } else {
                        state.lifecycle = PageLifecycle.EMPTY;
                    }
                }, () => this.forceUpdate())
            })
            .catch((error: any) => {
                this.setState((state: AppState) => {
                    console.log("Error getting document:", error);
                    state.lifecycle = PageLifecycle.ERROR
                }, () => this.forceUpdate())
            })

        /*function(auth) {
    if (auth.exists && (auth.data().auth !== [] || auth.data().s2s_auth !== [])) {
        console.log("Document data:", auth.data());
        this.setState((state: AppState) => {
            if (user) {
                state.lifecycle = AppLifecycle.APP;
            } else {
                state.lifecycle = AppLifecycle.LOGIN;
                state.loginErrorMessage = "User doesn't have access";
            }
        }
        this.setState(this.getState().lifecycle = PageLifecycle.DATA)
    } else {
        this.state.lifecycle = PageLifecycle.EMPTY
    }
}).catch(function(error) {
    console.log("Error getting document:", error);
    this.state.lifecycle = PageLifecycle.ERROR
});
*/
        /*this.services.firebase.firestore().collection('en_auth').doc('my_user_id_123').set({
            auth: [{"token": "1231231231", "origins": ["abc.com"]}],
            s2s_auth: [],
        }).then(function () {
            console.log("Document successfully written!");
        })
            .catch(function (error) {
                console.error("Error writing document: ", error);
            });*/
    }

    deleteAuth(index) {
        this.setState((state: AppState) => {
            state.keys.auth.splice(index, 1)
        }, () => this.forceUpdate());
    }

    render() {
        switch (this.state.lifecycle) {
            case PageLifecycle.EMPTY:
                return this.empty();
            case PageLifecycle.DATA:
                return this.data(this.state.keys);
            case PageLifecycle.ERROR:
                return (<h1>Error</h1>);
            case PageLifecycle.LOADING:
                return (<Spin/>);

        }
    }

    data(keys) {
        return (
            <div className="container">
                <Card title="API Keys" extra={<a href="#">More</a>} style={{width: 800}}>
                    {keys.auth.map(function (t: Token, index) {
                        return (<p key={index}>{t.token} - {t.origins} <DeleteOutlined /></p>)//onClick={this.deleteAuth(index).bind(this)}
                    })}
                </Card>
                <Card title="S2S API Keys" extra={<a href="#">More</a>} style={{width: 800}}>

                    {keys.s2s_auth.map(function (t: Token, index) {
                        return <p key={index}>{t.token} - {t.origins}</p>;
                    })}
                </Card>
            </div>
        );
    }

    empty() {
        return (
            <h1>Empty</h1>
        );
    }
}