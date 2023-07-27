import CookieForPath from "../CookieForPath.js";
import { createContent, error, log } from "../Helper.js";
import { getHttpData } from "../getHttpData.js";
import { Type, type Schema, type SwaggerAPI } from "./SwaggerAPI";
const projectKey = Const.CookieProjectKey;
const cookieForPath = new CookieForPath(projectKey);

const $g = (id) => { return <HTMLInputElement>document.getElementById(id) };

cookieForPath.getPathCookie("txtSwaggerAPIURL");

$g("btnGetSwaggerAPI").addEventListener("click", getAPIData);

interface TagData {
    tag: string;

    data: PathData[];
}

interface PathData {
    path: string;

    request: Schema;
    response: Schema;

    summary: string;
}

let currentData: SwaggerAPI;

function getSchema(schemaRef: string, data: SwaggerAPI): Schema {
    //#/components/schemas/ItemDto
    let rawRef = schemaRef;
    if (schemaRef.startsWith("#")) {
        schemaRef = schemaRef.slice(2);
        const schemaData = schemaRef.split("/");
        let dat: Schema = data as any;
        for (let i = 0; i < schemaData.length; i++) {
            const key = schemaData[i];
            dat = dat[key];
            if (!dat) {
                break;
            }
        }
        dat.ref = rawRef;
        return dat;
    }
}

function createTag(tagData: TagData, parent: HTMLElement) {
    const label = document.createElement("label");
    const select = document.createElement("input");
    select.type = "radio";
    select.name = "SwaggerTag";
    //@ts-ignore
    select.data = tagData;
    select.addEventListener("click", onTagClick);
    const text = document.createTextNode(tagData.tag);
    label.appendChild(select);
    label.appendChild(text);
    parent.appendChild(label);
}

function findSchemas(schema: Schema, schemas: { [ref: string]: Schema }) {
    if (schema.type == "object") {
        const properties = schema.properties;
        for (let proKey in properties) {
            let pro = properties[proKey];
            let ref = pro.$ref;
            if (ref && !schemas[ref]) {
                const schema = getSchema(ref, currentData);
                schemas[schema.ref] = schema;
            } else {
                if (pro.type == Type.Array) {
                    let ref = pro.items.$ref;
                    const schema = getSchema(ref, currentData);
                    schemas[schema.ref] = schema;
                }
            }
        }
    }
}


function getSchemaContent(schema: Schema, lines: string[], writed: { [ref: string]: boolean }, cmd?: string) {
    writed[schema.ref] = true;
    if (schema.type == "object") {
        const properties = schema.properties;
        let name = schema.name;
        lines.push(`#### ${name}`);
        lines.push(`[${name}]: #${name.toLowerCase()}  `)
        lines.push("```protobuf");
        lines.push(`message ${name} {`)
        if (cmd) {
            lines.push(`    option (cmd) = "${cmd}";`);
        }
        let refs: string[] = [];
        let idx = 1;
        for (let proKey in properties) {
            let pro = properties[proKey];
            let ref = pro.$ref;
            let type: string;
            let lab = "optional";
            if (ref) {
                let sch = getSchema(ref, currentData);
                type = sch.name || getClassNameForPath(ref);
                refs.pushOnce(type);
            } else {
                type = pro.type;
                switch (type) {
                    case Type.Integer:
                        type = pro.format;
                        break;
                    case Type.Boolean:
                        type = "bool";
                        break;
                    case Type.String:
                        type = "string";
                        break;
                    case Type.Array:
                        lab = "repeated";
                        let ref = pro.items.$ref;
                        let sch = getSchema(ref, currentData);
                        type = sch.name || getClassNameForPath(ref);
                        refs.pushOnce(type);
                        break;
                }
            }
            lines.push(`    ${lab} ${type} ${proKey} = ${idx++};`)
        }
        lines.push(`}`);
        lines.push("```");
        for (const ref of refs) {
            lines.push(`[${ref}]  `);
        }
        lines.push("");
        lines.push("");
    }
}

function getClassNameForPath(p: string) {
    let name = p.slice(p.lastIndexOf("/") + 1);
    return name[0].toUpperCase() + name.slice(1);
}

function onTagClick() {
    const data: TagData = this.data;
    if (data) {
        const { data: pathDatas } = data;
        const schemas = {} as { [ref: string]: Schema };
        let lines: string[] = [];
        let rpcs = {};
        for (const path of pathDatas) {
            const { request, response, summary } = path;
            lines.push(`## ${summary}`);
            let p = path.path;
            let apiName = getClassNameForPath(p);
            request.name = apiName + "_C";
            response.name = apiName + "_S";
            schemas[request.ref] = request;
            schemas[response.ref] = response;
            findSchemas(request, schemas);
            findSchemas(response, schemas);

            lines.push(`### ${summary}请求`)
            getSchemaContent(request, lines, rpcs, p);
            lines.push("");

            lines.push(`### ${summary}回调`)
            getSchemaContent(response, lines, rpcs, p);
            lines.push("");
        }
        //创建Schema
        lines.push("");
        lines.push(`### 其他`)
        for (let ref in schemas) {
            const schema = schemas[ref];
            if (!rpcs[ref]) {
                let name = getClassNameForPath(ref);
                schema.name = name;
                getSchemaContent(schema, lines, rpcs);
            }
        }
        $g("code").innerHTML = "";
        createContent("code", "wiki", 0, lines.join("\n"), "markdown")
    }
}

async function getAPIData() {
    const SwaggerAPIURL = cookieForPath.setPathCookie("txtSwaggerAPIURL", false);
    const { content } = await getHttpData(SwaggerAPIURL);
    let data: SwaggerAPI
    try {
        data = JSON.parse(content);
    } catch {
        error("拉取API失败，请检查网络!!")
        return
    }
    currentData = data;
    //得到Tags
    const tags: { [tag: string]: TagData } = {};
    const { paths } = data;
    for (let path in paths) {
        const { post: { tags: [tag], summary, requestBody: { content: { "application/json": { schema: { $ref: ReqRef } } } }, responses: { 200: { content: { "*/*": { schema: { $ref: RespRef } } } } } } } = paths[path];
        let tagData = tags[tag];
        if (!tagData) {
            tags[tag] = tagData = { tag, data: [] };
        }
        tagData.data.push({ path, request: getSchema(ReqRef, data), response: getSchema(RespRef, data), summary })
    }

    const cnt = $g("SwaggerTag");
    cnt.innerHTML = "";

    for (const tag in tags) {
        const tagData = tags[tag];
        createTag(tagData, cnt);
    }

}

