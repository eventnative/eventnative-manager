import {randomId} from "../commons/utils";

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
    //new DestinationConfigFactory("BigQuery", "bigquery", (id) => new BQConfig(id)),
    new DestinationConfigFactory("Redshift", "redshift", (id) => new RedshiftConfig(id)),
]

export const destinationsByTypeId = destinationConfigTypes.reduce((map: Record<string, DestinationConfigFactory<any>>, obj) => {
    map[obj.type] = obj;
    return map;
}, {})


export abstract class DestinationConfig {
    protected readonly _uid = randomId();
    protected readonly _id: string
    protected readonly _type: string
    protected _formData: any = {};


    constructor(type: string, id: string) {
        this._id = id;
        this._type = type;
        this.fillInitialValues(this._formData);
    }

    public update(formValues: any): void {
        this._formData = formValues;
    }

    get id(): string {
        return this._id;
    }

    get type(): string {
        return this._type;
    }


    get formData(): any {
        return this._formData;
    }

    abstract describe();

    protected fillInitialValues(_formData: any) {
        _formData['mode'] = "streaming";
        _formData['tableName'] = 'events';
    }
}


export class PostgresConfig extends DestinationConfig {
    constructor(id: string) {
        super("postgres", id);
    }



    describe() {
        return `${this.formData['pguser']}:${this.formData['pgpassword']}@${this.formData['pghost']}:${this.formData['pgport']}/${this.formData['pgdatabase']}, ${this.formData['mode']}`
    }


    protected fillInitialValues(_formData: any) {
        super.fillInitialValues(_formData);
        _formData['pgport'] = 5432;
        _formData['pgschema'] = 'public';
    }
}

export class ClickHouseConfig extends DestinationConfig {
    private _dsns: string = ""
    private _cluster: string = ""
    private _database: string = ""

    constructor(id: string) {
        super("clickhouse", id);
    }


    describe() {
        return `${this.formData['ch_dsns']}, ${this.formData['mode']}`
    }


    get dsns(): string {
        return this._dsns;
    }

    get cluster(): string {
        return this._cluster;
    }

    get database(): string {
        return this._database;
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

export class RedshiftConfig extends DestinationConfig {

    constructor(id: string) {
        super("redshift", id);
    }


    protected fillInitialValues(_formData: any) {
        super.fillInitialValues(_formData);
        _formData['redshiftS3Region'] = "us-west-1"
        _formData['redshiftUseHostedS3'] = false;
        _formData['redshiftSchema'] = 'public'
    }

    describe() {
        return `${this.formData['redhsiftHost']}`
    }
}

export class BQConfig extends DestinationConfig {

    constructor(id: string) {
        super("bigquery", id);
    }

    toJson(): any {
    }

    describe() {
    }
}
