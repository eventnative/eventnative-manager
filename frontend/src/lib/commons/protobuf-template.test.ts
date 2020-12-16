import protobugJsonDescriptors from "../../generated/objects.json";
import {generateTemplateJSON} from "./protobuf-template";

test("testProto", () => {
    let templateJSON = generateTemplateJSON(protobugJsonDescriptors, "jitsu.FirebaseConfig");
    console.log(JSON.stringify(templateJSON, null, 4))
})