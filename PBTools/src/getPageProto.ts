
import * as _proto from "protobufjs";
import * as _pbjs from "../lib/protobuf";
const pbjs: typeof _proto = _pbjs;

const escChars = { "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "\'", "&amp;": "&", "&nbsp;": " ", "&#x000A;": "\n" };
function escapeHTML(content: string) {
    return content.replace(/&lt;|&gt;|&quot;|&apos;|&amp;|&nbsp;|&#x000A;/g, substring => {
        return escChars[substring];
    });
}


const enum WikiType {
    GitLab = 0,
    DokuWiki = 1
}

export default function getPageProto(content: string) {
    content = escapeHTML(content);
    // 从HTML流中截取 message {} 或者 option (xxxx) = "xxxx" 这样的数据
    let reg: RegExp;
    let type: number;
    if (~content.indexOf(`<meta content="GitLab"`)) {
        // gitlab wiki
        reg = /<pre[ ]class="code[ ]highlight[ ]js-syntax-highlight[ ](?:protobuf|plaintext)"[^>]*?><code>([^]*?)<\/code><\/pre>/mg;
        type = WikiType.GitLab;
    }
    else if (~content.indexOf(`<meta name="generator" content="DokuWiki">`)) {
        // dokuwiki
        reg = /<pre class="code">([^>]*?message[ ]+[A-Z][a-zA-Z0-9_$]*[ ]*[{][^]*?[}][^]*?|[^>]*?option[ ]+[(]\w+[)][ ]*=[ ]*".*?";[^]*?)<\/pre>/mg;
        type = WikiType.DokuWiki;
    }
    else {
        throw Error("目前只支持GitLab的wiki以及DokuWiki！！");
    }
    let proto = "";
    while (true) {
        let result = reg.exec(content);
        if (result) {
            proto += result[1] + "\n";
        } else {
            break;
        }
    }
    if (type == WikiType.GitLab) {
        //清除格式
        proto = proto.replace(/<span.*?>|<\/span>/g, "");
    }
    return proto;
}

export function getJavaPageData(content: string, name: string) {
    let forJavaContent = [] as string[];
    let cmds: { [index: number]: Cmd } = {};
    let impRefNames = [] as string[];
    let refs = {} as ProtoRefDict;
    let page = { rawName: name, rawContent: content, refs, impRefNames, cmds } as Page;

    let p: _proto.MetaProto;
    try {
        p = pbjs.DotProto.Parser.parse(content);
    } catch (e) {
        e.message = `页面${name}发生错误，message:${e.message}`;
        throw e;
    }

    const { enums, messages } = p;

    let javaName = p.options[Options.JavaClass];
    let enumDict: { [index: string]: boolean } = {};
    for (let e of enums) {
        setProtoRef(page, e);
        let name = e.name;
        enumDict[name] = true;
        forJavaContent.push(`enum ${name} {`);
        e.values.forEach(v => {
            let comment = v.comment;
            comment = comment ? "//" + comment : "";
            forJavaContent.push(`\t${name}_${v.name}=${v.id};${comment}`);
        });
        forJavaContent.push(`}`);
    }

    for (let msg of messages) {
        setProtoRef(page, msg);
        let { name, options, fields } = msg;
        let message = name;
        let reuseMsg: boolean;
        let cmddata: any = options[Options.CMD];
        if (cmddata != undefined) {
            let smodule = options[Options.ServerModule];
            let cs: number[] = Array.isArray(cmddata) ? cmddata : [cmddata];
            let type: number;
            let fLen = fields.length;
            if (fLen == 0) {
                type = NSType.Null;
            }
            else if (fLen > 1) {
                type = NSType.ProtoBuf;
            } else {
                let field = fields[0];
                let ftype = field.type;
                if (enumDict[ftype] || ftype.startsWith("E_")) {
                    type = NSType.Int32;
                } else {
                    let [fieldType, isMsg, tType, repeated] = field2type(field);
                    if (((isMsg & MsgType.isServerMsg) == MsgType.isServerMsg) || repeated) {
                        type = NSType.ProtoBuf;
                        if (!repeated && isOptMsg) {
                            reuseMsg = true;
                            name = fieldType;
                        }
                    } else {
                        type = tType as number;
                    }
                }
            }
            cs.forEach(c => { cmds[c] = { name, type, smodule, message } });
        }

        if (!reuseMsg) {
            forJavaContent.push(`message ${name} {`);
            fields.forEach(v => {
                let comment = v.comment;
                comment = comment ? "//" + comment : "";
                let def = v.options.default;
                def = def ? `[default=${def}]` : "";
                forJavaContent.push(`\t${v.rule} ${v.type} ${v.name} = ${v.id} ${def};${comment}`);
            });
            forJavaContent.push(`}`);
        }
    }

    //检查外部引用
    for (let msg of messages) {
        let fields = msg.fields;
        for (let field of fields) {
            let [, isMsg] = field2type(field);
            if (isMsg) {
                let type = field.type;
                if (!refs[type]) {
                    impRefNames.push(type);
                }
            }
        }
    }

    if (javaName) {
        name = javaName;
    } else {
        name = Pinyin.getFullChars(name).replace(/[^a-zA-Z]/g, "");
    }

    page.content = forJavaContent.join("\n");
    page.name = name;
    return page;
}

function setProtoRef(page: Page, proto: Proto) {
    let name = proto.name;
    let refs = page.refs;
    if (name in refs) {
        throw Error(`${page.rawName}的页面中message或者enum出现重名[${name}]`);
    }
    refs[name] = { name, page, proto };
}