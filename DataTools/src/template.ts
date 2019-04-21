// -------------define.d.ts----------------------
interface CodeGenOpt {
    className: string;

    properties: Property[];
}


interface Property {
    name: string,
    optional: boolean,
    type: PBType
}


//-------------ClientCodeTemplate.ts-------------------------
export function getCode(opt: CodeGenOpt) {
    return `class ${opt.className} {
${opt.properties.map(getProperties).join("\t")}
}`
}

const typeDict = {
    [PBType.Int32]: "number",
    [PBType.Int64]: "number",
}

function getProperties({ name, type, optional }: Property) {
    return `${name}${optional ? "?" : ""}: ${typeDict[type]};`
}