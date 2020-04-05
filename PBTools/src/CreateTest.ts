//用于创建测试用的gm指令

import { analyseIndex, commitGitToOrigin, getDist, IndexResult } from "./GitlabHelper";
import { log, CmdSuffix, error } from "./Helper";

import type { ProtoMessage, ProtoEnum } from "protobufjs"


export async function createTest(indexUrl: string) {
    let result: IndexResult;
    try {
        result = await analyseIndex(indexUrl);
    } catch (e) {
        error("", e)
    }
    if (result) {
        let gitChanged = [];
        const { c2s, s2c } = CmdSuffix;
        const { pages, globalRefs, urlResult } = result;
        for (let name in pages) {
            const { rawName, cmds, refs, options, rawContent, path } = pages[name];
            if (Object.keys(cmds).length) {
                let pageTest = [] as string[];
                //次页面有通讯指令，可以进行生成测试样例
                log(`检查到有通讯指令，准备给页面${rawName}，生成测试样例`);
                for (let cmd in cmds) {
                    const { name } = cmds[cmd];
                    let isC2S = name.endsWith(c2s);
                    let isS2C = name.endsWith(s2c);
                    if (isC2S || isS2C) {
                        let testStr = getMessageSample(refs[name], globalRefs);
                        if (testStr) {
                            let service = options[Options.ServiceName];
                            let handlerName = name[0].toLowerCase() + name.substring(1);
                            if (isC2S) {
                                pageTest.push(`//S2C指令${name}，cmd:${cmd}`,
                                    `$gm.$.${service}.${handlerName}(${testStr})`);
                            } else {
                                pageTest.push(`//C2S指令${name}，cmd:${cmd}`,
                                    `$gm.route(${cmd}, ${testStr})`);
                            }
                        }
                    } else {
                        error(`页面${rawName}的message[${name}有误，配置了(cmd=${cmd})]，但后缀却不是以[${c2s}]或者[${s2c}]结尾`)
                    }
                }
                if (pageTest.length) {
                    let testStr = "## 自动生成的测试样例\n```js\n" + pageTest.join("\n") + "\n```";
                    //检查md文件，附加到文件结尾
                    //检查rawContent中是否已经有测试样例
                    const reg = /## 自动生成的测试样例\n```js.*?```/;
                    let newContent = rawContent;
                    if (rawContent.search(reg) > -1) {
                        newContent = rawContent.replace(reg, testStr);
                    } else {
                        newContent = rawContent + "\n\n" + testStr;
                    }
                    //将数据存入页面
                    const fs: typeof import("fs") = nodeRequire("fs");
                    fs.writeFileSync(path, newContent);
                    gitChanged.push(rawName + Const.MarkDownExt);
                }
            }
        }
        if (gitChanged.length) {
            commitGitToOrigin(getDist(urlResult.project), gitChanged, "生成自动测试样例");
        }
    }
}

function getMessageSample(msg: ProtoRef, globalRefs: ProtoRefDict, level = 0) {
    if (msg.type == ProtoType.Enum) {
        const { values } = msg.proto as ProtoEnum;
        if (values.length) {
            return `"${values[0]}"`
        }
    } else {
        const { fields } = msg.proto as ProtoMessage;
        let output = "{\n";
        let flen_1 = fields.length - 1;
        for (let i = 0; i <= flen_1; i++) {
            const { type, comment, name } = fields[i];
            let value = "";
            switch (type) {
                case "double":
                case "float":
                    value = "0.5";
                    break;
                case "int64":
                case "uint32":
                case "uint64":
                case "int32":
                case "fixed64":
                case "fixed32":
                case "sfixed32":
                case "sfixed64":
                case "sint32":
                case "sint64":
                    value = "1";
                    break;
                case "bool":
                    value = "true";
                    break;
                case "string":
                    value = "\"1\"";
                    break;
                case "byte":
                    value = "new jy.ByteArray(new Uint8Array([0]))";
                    break;
                default:
                    {
                        let ref = globalRefs[type];
                        if (ref) {
                            value = getMessageSample(ref, globalRefs, level + 1);
                        }
                        break;
                    }
            }
            if (value) {
                output += `${getIdent(level + 1)}${name} : ${value}${i == flen_1 ? "" : ","}${comment ? `//${comment}` : ""}\n`;
            }
        }
        output += "}";
        return output;
    }
}

function getIdent(value: number) {
    let i = 0;
    let str = "";
    while (i++ < value) {
        str += "\t";
    }
    return str;
}

