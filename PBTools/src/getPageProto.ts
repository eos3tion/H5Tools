
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

    let p: _proto.MetaProto;
    try {
        p = pbjs.DotProto.Parser.parse(content);
    } catch (e) {
        e.message = `页面${name}发生错误，message:${e.message}`;
        throw e;
    }
    let javaName = p.options[Options.JavaClass];
    let enumDict: { [index: string]: boolean } = {};
    for (let e of p.enums) {
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

    for (let msg of p.messages) {
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
    if (javaName) {
        name = javaName;
    } else {
        name = Pinyin.getFullChars(name).replace(/[^a-zA-Z]/g, "");
    }
    // content = content.replace(/option[ ]*\([a-zA-Z]+\)[ ]*=.*?;/g, "");

    // //匹配enum
    // content = content.replace(/enum[ ]+([^{ ]+)[ ]*{[^}]+}/mg, (match, name, handler) => {
    //     return match.replace(/([a-zA-Z0-9_$]+)([ ]*=[ ]*\d+[ ]*;)/g, `${name}_$1$2`);
    // });
    // content = content.replace(/(\s+)int32(\s+)/g, "$1sint32$2");

    return { name, content: forJavaContent.join("\n"), cmds } as Page;
}