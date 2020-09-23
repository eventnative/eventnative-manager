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
