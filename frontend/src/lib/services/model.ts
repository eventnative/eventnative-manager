import {strict} from "assert";

export class Project {
    private readonly _id: string
    private readonly _name: string

    constructor(id: string, name: string) {
        this._id = id;
        this._name = name;
    }


    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }
}


/**
 * User information that was retried from auth method. Might contain
 * some information that will be usefull for autofill during on-boarding process
 */
export type SuggestedUserInfo = {
    //mandatory: user email (lower-case)
    email: string
    //user name (Firstname Lastname)
    name?: string
}


export class User {
    private readonly _uid: string;
    private readonly _email: string;
    private _name: string;
    private _projects: Project[] = []
    private _onboarded = false;
    private readonly _suggestedInfo: SuggestedUserInfo;

    constructor(uid: string, suggested: SuggestedUserInfo, data?: any) {
        this._uid = uid;
        console.info(suggested, data);
        this._suggestedInfo = suggested;
        this._email = suggested.email;
        if (data) {
            let projectSingleton = data._project;
            delete data['_project'];
            Object.assign(this, data);
            if (projectSingleton) {
                this._projects = [projectSingleton];
            }
            this._onboarded = true;
        } else {
            this._name = suggested.name;
        }
    }


    get uid(): string {
        return this._uid;
    }

    get onboarded(): boolean {
        return this._onboarded;
    }

    get suggestedInfo(): SuggestedUserInfo {
        return this._suggestedInfo;
    }

    set onboarded(value: boolean) {
        this._onboarded = value;
    }


    get email(): string {
        return this._email;
    }

    get name(): string {
        return this._name;
    }

    get projects(): Project[] {
        return this._projects;
    }


    set name(value: string) {
        this._name = value;
    }

    set projects(value: Project[]) {
        this._projects = value;
    }
}

