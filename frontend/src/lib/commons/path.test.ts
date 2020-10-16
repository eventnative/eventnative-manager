import {Route} from "./path";

test("testPathParsing", () => {
    let parsed = new Route("/#/page/?param1=2&param2=&param3");
    expect(parsed.path).toBe("page");
    expect(parsed.params['param1']).toBe("2");
    expect(parsed.params['param2']).toBe(null);
    expect(parsed.params['param3']).toBe(true);

    let parsed2 = new Route("/#/?param1=2&param2=&param3");
    expect(parsed2.path).toBe("")

    let parsed3 = new Route("?param1=2&param2=&param3");
    expect(parsed3.path).toBe("")

    let parsed4 = new Route("?");
    expect(parsed4.path).toBe("")
});
