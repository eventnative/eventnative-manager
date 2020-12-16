type NameResolver = (str) => any;

export function generateTemplateJSON(jsonDescriptor: any, typeName: any): any {
    return _generateTemplateJSON(jsonDescriptor, typeName.split("."))
}


function _generateTemplateJSON(jsonDescriptor: any, typeName: string[]) {
    let nameResolver = (name) => {
        let desc = jsonDescriptor['nested'][name];
        if (!desc) {
            throw Error(`Can't find ${name} in ${Object.keys(jsonDescriptor['nested'])}`)
        }
        return desc
    }

    let next = nameResolver(typeName[0]);
    typeName.shift();
    return typeName.length === 0 ? _generateTemplateJSONFromClassDescriptor(next, nameResolver) : _generateTemplateJSON(next, typeName);
}


function _generateTemplateJSONFromClassDescriptor(desc: any, nameResolver: NameResolver) {
    let res = {};

    for (const [fieldName, fieldInfo] of Object.entries(desc['fields'])) {
        res[fieldName] = _getFieldTemplate(fieldInfo, nameResolver);
    }
    return res;
}

function _getFieldTemplate(f: any, nameResolver: NameResolver) {
    if (f.rule === 'repeated') {
        let newType = {...f};
        delete newType.rule
        return [_getFieldTemplate(newType, nameResolver)]
    }
    if (f.type === 'string') {
        return "";
    } else if (f.type === 'int32' || f.type == 'int64' || f.type == 'uint32' || f.type == 'uint64' || f.type == 'sint32' || f.type == 'sint64' || f.type == 'fixed32' || f.type ==  'fixed64' || f.type == 'sfixed32' || f.type == 'sfixed64') {
        return 0;
    } else if (f.type === 'float' || f.type == 'double') {
        return 0.0;
    } else if (f.type === 'boolean') {
        return true;
    } else if (f.type === 'google.protobuf.Struct') {
        return {}
    } else {
        let type = nameResolver(f.type);
        if (!type) {
            console.warn(`Unknown type ${f.type} of ${f.name}`, f);
            return {}
        } else {
            return _generateTemplateJSONFromClassDescriptor(type, nameResolver)
        }
    }


}


