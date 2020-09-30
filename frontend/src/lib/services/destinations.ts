export class DestinationConfigFactory<T extends DestinationConfig> {
    private readonly _name: string;
    private readonly _type: string;
    private readonly _factory: (id) => T

    constructor(name: string, type: string, factory: (id) => T) {
        this._type = type;
        this._factory = factory;
        this._name = name;
    }

    get type(): string {
        return this._type;
    }


    get name(): string {
        return this._name;
    }


    get factory(): (id) => T {
        return this._factory;
    }
}

export const destinationConfigTypes = [
    new DestinationConfigFactory("PostgresSQL", "postgres", (id) => new PostgresConfig(id)),
    new DestinationConfigFactory("ClickHouse", "clickhouse", (id) => new ClickHouseConfig(id)),
    new DestinationConfigFactory("BigQuery", "bigquery", (id) => new BQConfig(id)),
]

export const destinationsByTypeId = destinationConfigTypes.reduce((map: Record<string, DestinationConfigFactory<any>>, obj) => {
    map[obj.type] = obj;
    return map;
}, {})


export abstract class DestinationConfig {
    protected readonly _id: string
    protected readonly _type: string
    protected _mode: "streaming" | "batch" = "batch"
    protected _originalFormData: any = null;
    protected _tableNamePattern: string = "events"


    constructor(type: string, id: string) {
        this._id = id;
        this._type = type;
    }

    update(formValues: any): void {
        this._originalFormData = formValues;
        this._tableNamePattern = formValues['tableName']
        this._mode = formValues['mode']
    }

    get id(): string {
        return this._id;
    }

    get type(): string {
        return this._type;
    }


    get mode(): "streaming" | "batch" {
        return this._mode;
    }

    get tableNamePattern(): string {
        return this._tableNamePattern;
    }

    abstract describe();
}


export class PostgresConfig extends DestinationConfig {
    private _database: string = "";
    private _host: string = "";
    private _password: string = "";
    private _port: number = 5432;
    private _user: string = "";

    constructor(id: string) {
        super("postgres", id);
    }

    update(formValues: any): void {
        super.update(formValues);
        this._database = formValues['pgdatabase']
        this._host = formValues['pghost'];
        this._password = formValues['pgpassword']
        this._port = formValues['pgport']
        this._user = formValues['pguser']
    }


    get database(): string {
        return this._database;
    }

    get host(): string {
        return this._host;
    }

    get password(): string {
        return this._password;
    }

    get port(): number {
        return this._port;
    }

    get user(): string {
        return this._user;
    }

    describe() {
        return `${this.user}@${this.host}:${this.port}/${this.database}, ${this._mode}`
    }
}

export class ClickHouseConfig extends DestinationConfig {

    constructor(id: string) {
        super("clickhouse", id);
    }

    update(formValues: any): void {
        super.update(formValues);
    }

    describe() {
    }
}


export class SnowflakeConfig extends DestinationConfig {

    constructor(id: string) {
        super("snowflake", id);
    }

    update(formValues: any): void {
        super.update(formValues);
    }

    describe() {
    }
}

export class Redshift extends DestinationConfig {

    constructor(id: string) {
        super("redshift", id);
    }

    update(formValues: any): void {
    }

    describe() {
    }
}

export class BQConfig extends DestinationConfig {

    constructor(id: string) {
        super("bigquery", id);
    }

    toJson(): any {
    }

    update(formValues: any): void {
    }

    describe() {
    }
}
