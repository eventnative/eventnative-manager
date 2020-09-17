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

export class User {
    private readonly email: string;
    private readonly name: string;
    private readonly projects?: Project[]

    constructor(email: string, name: string) {
        this.email = email;
        this.name = name;
    }
}

