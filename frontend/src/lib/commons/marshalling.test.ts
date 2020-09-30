import Marshal from "./marshalling";

class Data {
    num = 12
    str = "str"
    internal: DataEmbedded;


    public method(): number {
        return this.num
    }
}

class DataEmbedded {
    str2: string = "embedded"

    public method(): string {
        return this.str2
    }
}

test("marshalUnmarshal", () => {
    let pureJson = Marshal.toPureJson(new Data());
    console.log(pureJson)
    expect(pureJson['num']).toBe(12)
    expect(pureJson['internal']['str2']).toBe("embedded")

    pureJson['num'] = 13
    pureJson['internal']['str2'] = 'embedded2'

    let copy = Marshal.newInstance(Data, pureJson);
    console.log(copy);
    expect(copy['num']).toBe(13)
    expect(copy['internal']['str2']).toBe("embedded2")
    expect(copy.method()).toBe(13)

    expect(copy.internal.method()).toBe("embedded2")
})

class Superclass {
    public a: string;

    constructor(a: string) {
        this.a = a;
    }
}

class Subclass extends Superclass {
    public b: string;

    constructor(a: string, b: string) {
        super(a);
        this.b = b;
    }
}