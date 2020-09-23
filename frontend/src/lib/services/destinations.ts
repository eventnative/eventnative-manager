

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
}

export const destinationConfigTypes = [
    new DestinationConfigFactory("PostgresSQL", "postgres", (id) => new PostgresConfig(id)),
    new DestinationConfigFactory("ClickHouse", "clickhouse", (id) => new ClickHouseConfig(id)),
    new DestinationConfigFactory("BigQuery", "bigquery", (id) => new BQConfig(id)),
]


export abstract class DestinationConfig {
    private readonly _id: string
    private readonly _type: string


    constructor(type: string, id: string) {
        this._id = id;
        this._type = type;
    }

    abstract toJson(): any


    get id(): string {
        return this._id;
    }

    get type(): string {
        return this._type;
    }
}


export class PostgresConfig extends DestinationConfig {

    constructor(id: string) {
        super("postgres", id);
    }

    toJson(): any {
    }
}

export class ClickHouseConfig extends DestinationConfig {

    constructor(id: string) {
        super("clickhouse", id);
    }

    toJson(): any {
    }
}


export class SnowflakeConfig extends DestinationConfig {

    constructor(id: string) {
        super("snowflake", id);
    }

    toJson(): any {
    }
}

export class Redshift extends DestinationConfig {

    constructor(id: string) {
        super("redshif", id);
    }

    toJson(): any {
    }
}

export class BQConfig extends DestinationConfig {

    constructor(id: string) {
        super("bigquery", id);
    }

    toJson(): any {
    }
}
