import React, {ReactElement, ReactNode, useEffect, useState} from 'react';
import {CodeSnippet, LoadableComponent} from "../components";
import ApplicationServices from "../../services/ApplicationServices";
import './DownloadConfig.less'
import {CloudDownloadOutlined} from "@ant-design/icons";


type State = {
    code: string
}

function download(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export class DownloadConfig extends LoadableComponent<{}, State> {
    private readonly services: ApplicationServices = ApplicationServices.get();

    protected async load(): Promise<State> {
        return {
            code: await this.services.backendApiClient.getRaw(`/eventnative/configuration?project_id=${this.services.activeProject.id}`)
        }
    }

    protected renderReady(): React.ReactNode {
        return <>
            <div className="download-config-documentation">
                If you want to host your own instance of <a href="https://github.com/ksensehq/eventnative">EventNative</a>, you can use this configuration file.
                It includes all your keys, destinations and other settings you created here. <a href="https://docs.eventnative.dev/deployment">EventNative can be deployed just in a few clicks!</a>
            </div>
            <CodeSnippet
                toolbarPosition='top' language="yaml" size="large"
                extra={<a onClick={() => {download('eventnative.yml', this.state.code)}}><u>./eventnative.yml</u> <CloudDownloadOutlined/></a>}

            >{this.state.code}</CodeSnippet></>
    }

}