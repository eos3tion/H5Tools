
import CookieForPath from "../CookieForPath.js";
import "../../lib/hanzi2pinyin.js";
import "../../lib/protobuf.js";
import { createContent as createContentOrigin, writeFile, log, error, progress, getTempPath, CmdSuffix } from "../Helper.js";
import { addCmds } from "./UECmdTemplate.js";
import { analyseUrl, updateWithGit, checkIndexPage, getProtoFromMD, checkGitIsOK } from "../GitlabHelper.js";
import { ClassHelper, getClassHelper } from "./UEClassHelper.js";
const pbjs: typeof import("protobufjs") = ProtoBuf;
const path: typeof import("path") = nodeRequire("path");

const projectKey = Const.CookieProjectKey;
const cookieForPath = new CookieForPath(projectKey);
const txtModuleAPIName = "txtModuleAPI";
cookieForPath.getPathCookie(txtModuleAPIName);



function createContent(parentID: string, filename: string, idx: number, ccode: string) {
    createContentOrigin(parentID, filename, idx, ccode, "c++")
}

function createClassHelper(gcfg: ClientCfg) {
    let cprefix = gcfg ? gcfg.cprefix : null;
    if (cprefix) {
        classHelper = getClassHelper(cprefix);
        error(classHelper.getError());
    }
}

let classHelper: ClassHelper;

async function requestAll(cookieForPath: CookieForPath, gcfg: ClientCfg) {
    progress.reset();
    let wikiUrl = cookieForPath.setPathCookie("txtServerWiki", false, false);
    if (!wikiUrl) {
        return alert("解析服务的地址不能为空");
    }
    if (!checkGitIsOK()) {
        return;
    }
    const { page, gitUrl, project, baseWikiUrl } = analyseUrl(wikiUrl);
    let dist = path.join(getTempPath(), Const.GitTempPath, project);
    await updateWithGit(dist, gitUrl);
    createClassHelper(gcfg);
    //开始检查文件
    const pageDict = await checkIndexPage(dist, page);
    if (pageDict) {
        for (let name in pageDict) {
            const { proto } = pageDict[name];
            parseProto(proto, gcfg, getWikiUrl(name, baseWikiUrl));
        }
    }
}

async function request(url: string, gcfg: ClientCfg) {
    if (!checkGitIsOK()) {
        return;
    }
    createClassHelper(gcfg);
    const { page: name, gitUrl, project, baseWikiUrl } = analyseUrl(url);
    let dist = path.join(getTempPath(), Const.GitTempPath, project);
    await updateWithGit(dist, gitUrl);
    let { proto } = await getProtoFromMD(dist, name)
    parseProto(proto, gcfg, getWikiUrl(name, baseWikiUrl));
}

function getWikiUrl(name: string, baseWikiUrl: string) {
    return baseWikiUrl + "/" + name;
}


function parseProto(proto: string, gcfg?: ClientCfg, url?: string) {
    let inp = document.getElementById(txtModuleAPIName) as HTMLInputElement;
    let ModuleAPIName = inp.value.trim();
    if (ModuleAPIName) {
        ModuleAPIName = ModuleAPIName + " ";
    }
    cookieForPath.setPathCookie(txtModuleAPIName, false);
    url = url || (gcfg ? gcfg.url : "");
    url = url || "[文本框中，复制粘贴]";
    let cprefix = gcfg ? gcfg.cprefix : null;
    cprefix = cprefix || "";
    let p;
    try {
        p = pbjs.DotProto.Parser.parse(proto);
    } catch (e) {
        error(e);
        return;
    }
    const { c2s, s2c } = CmdSuffix;
    let options = p.options;
    // 处理文件级的Option
    let fcpath: string = options[Options.ClientPath];
    let service: string = options[Options.ServiceName];
    let pageChannel = +options[Options.Channel] || 0;
    let now = new Date().format("yyyy-MM-dd HH:mm:ss");
    let idx = 0;
    //处理枚举
    let enumDict: { [index: string]: string } = {};
    for (let e of p.enums) {
        let className: string = e.name;
        let variables: string[] = [];
        // 如果有消息体的同名 Option，覆盖
        let options = e.options;
        let cpath: string = options[Options.ClientPath] || fcpath;
        enumDict[className] = cpath;
        let values = e.values;
        let vlen: number = values.length;
        for (let i: number = 0; i < vlen; i++) {
            let v = values[i];
            v["type"] = "enum";
            getEnumVariable(v, variables);
        }

        let clientCode = getClientEnumCode(now, url, className, variables);
        if (cprefix && cpath != undefined/*cpath允许为`""`*/) {
            let cdir = path.join(cprefix, cpath, "enums");
            let out = writeFile(className + UEConstString.FileH, cdir, clientCode);
            if (out) {
                log(`<font color="#0c0">生成客户端代码成功，${out}</font>`);
            }
        }
        createContent("code", className + UEConstString.FileH, idx++, clientCode);
    }
    let hasService = false;
    let cmdDict: { [name: string]: string } = {};
    // 客户端和服务端的Service收发数组
    let deles: string[] = [], funcs: string[] = [], sendRegs: string[] = [], handlers: string[] = [], cRegs: string[] = [], cIncludes: string[] = [], implLines: string[] = [], simports: string[] = [];

    for (let msg of p.messages) {
        // 所有的变量
        // 一行一个
        let variables: string[] = [];
        // 如果有消息体的同名 Option，覆盖
        let options = msg.options;
        let nofunc = options[Options.NoFunction] !== undefined;
        let climit: number = +options[Options.ClientLimit];
        let msgChannel = +options[Options.Channel];
        let channel = isNaN(msgChannel) ? pageChannel : msgChannel;
        let cpath: string = options[Options.ClientPath] || fcpath;
        //如果设置的不是整数，则让climit为undefined
        isNaN(climit) && (climit = undefined);
        // repeated 字段的数量
        let repeatedCount = 0;
        let fieldDatas: FieldData[] = [];
        let imports: string[] = [];
        let cmddata: UECmdType = options[Options.CMD];
        for (let field of msg.fields) {

            let data = getVariable(field, variables, imports);
            fieldDatas.push(data);
        }
        let cdir = "";
        if (cprefix && cpath != undefined/*cpath允许为`""`*/) {
            cdir = path.join(cprefix, cpath, "msgs");
        }
        imports = imports.map(inc => getInclude(inc, "", cdir));
        // 根据CMD 生成通信代码
        // 生成代码
        let className: string = msg.name;
        /**
         * 是否需要生成消息
         */
        let isCreateMsg = true;
        // 进行消息检查
        // 会生成ProtoBuf Message的情况：
        // 1. 消息中 field 超过 2个
        // 2. 消息中 field 为 1个，但是数据为 repeated
        // 3. 消息为非 S2C 或者 C2S 的情况
        // let type = className.substr(-3);
        let ctype = className.slice(-1 * c2s.length);
        let stype = className.slice(-1 * s2c.length);
        let c = ctype == c2s;
        let s = stype == s2c;
        // let type = c ? ctype : s ? stype : "";
        if (c || s) {
            let fleng = fieldDatas.length;
            isCreateMsg = !isOptMsg || fleng > 1 || (fleng == 1 && repeatedCount > 0)
        }

        if (c) { // client to server
            if (!nofunc) {
                hasService = true;
                cmdDict[className] = cmddata;
                //创建send指令
                makeSendFunDefine(className, channel, funcs, sendRegs);
                makeSendFunImpl(service, className, implLines);
                cIncludes.push(getInclude(className, "msgs/", cdir));

            }
        } else if (s) { // server to client
            hasService = true;
            cmdDict[className] = cmddata;
            //创建Receive指令
            makeReceiveDele(className, deles);
            makeReceiveHandler(className, handlers);
            makeRegs(className, cRegs);
            cIncludes.push(getInclude(className, "msgs/", cdir));
        }

        if (isCreateMsg) { //需要生成消息
            let clientCode = getStructContent(now, url, className, variables, imports, ModuleAPIName);
            if (cdir) {
                let out = writeFile(className + UEConstString.FileH, cdir, clientCode);
                if (out) {
                    log(`<font color="#0c0">生成客户端代码成功，${out}</font>`);
                }
            }
            createContent("code", className + UEConstString.FileH, idx++, clientCode);
        }
    }


    //处理CMD文件
    if (cprefix) {
        let crout = path.join(cprefix, UEConstString.PBCmdName + UEConstString.FileH);
        let out: string;
        try {
            out = addCmds(crout, cmdDict, c2s, error, ModuleAPIName);

            log(`<font color="#0c0">生成客户端代码成功，${crout}</font>`);
        } catch (e) {
            error(e);
        }
        createContent("code", UEConstString.PBCmdName + UEConstString.FileH, idx++, out);
    }


    if (service && hasService) {
        //预处理Service
        //检查是否有客户端Service文件
        let cdir = path.join(cprefix, fcpath);
        let cpath = path.join(cdir, service);
        let NetCMDsPath = path.relative(cdir, cprefix);
        let ccodeH = getServiceHFileContent(now, url, service, cIncludes, deles, funcs, handlers, ModuleAPIName, NetCMDsPath.replace(/\\/g, "/"));
        let ccodeCPP = getServiceCPPFileContent(service, cRegs, implLines, sendRegs);

        // 创建客户端Service
        if (cprefix && cpath != undefined/*cpath允许为`""`*/) {

            let fileHName = service + UEConstString.FileH;
            let out = writeFile(fileHName, cdir, ccodeH);
            if (out) {
                log(`<font color="#0c0">生成客户端Service H 代码成功，${out}</font>`);
            }

            let fileCPPName = service + UEConstString.FileCPP;
            out = writeFile(fileCPPName, cdir, ccodeCPP);
            if (out) {
                log(`<font color="#0c0">生成客户端Service CPP 代码成功，${out}</font>`);
            }
        }

        createContent("code", service + UEConstString.FileH, idx++, ccodeH);
        createContent("code", service + UEConstString.FileCPP, idx++, ccodeCPP);

    }
}

function GetStructName(className: string) {
    return `F${className}`
}

/**
 * 获取Struct文件内容
 * @param createTime 
 * @param path 
 * @param className 
 * @param module 
 * @param variables 
 * @returns 
 */
function getStructContent(createTime: string, path: string, className: string, variables: string[], imports: string[], ModuleAPIName: string) {
    let vars = `\t` + variables.join(`\n\t`);
    return `#pragma once

#include "CoreMinimal.h"
${imports.join("\n")}
#include "${className}.generated.h"


/**
 * 使用JunyouProtoTools，从 ${path} 生成
 * 生成时间 ${createTime}
 **/
USTRUCT(BlueprintType)
struct ${ModuleAPIName}${GetStructName(className)}
{
    GENERATED_BODY()

${vars}
};
`
}

function getEnumVariable(field: ProtoBuf.ProtoField, variables: string[]): FieldData {
    let comment = field.comment;// 调整protobuf.js代码 让其记录注释
    let fname = field.name;
    let fValue = field.id;
    let [fieldType, isMsg, , repeated] = field2type(field);
    variables.push(`/**`);
    variables.push(` * ${comment}`);
    variables.push(` */`);
    variables.push(`${fname} = ${fValue},`);

    return { fieldName: fname, fieldType, isMsg, tType: NSType.Uint32, repeated };
}

function getEnumName(className: string) {
    return `E${className}`;
}

function getClientEnumCode(createTime: string, path: string, className: string, variables: string[]) {
    let vars = `\t` + variables.join(`\n\t`);
    return `#pragma once

#include "CoreMinimal.h"


/**
 * 使用JunyouProtoTools，从 ${path} 生成
 * 生成时间 ${createTime}
 */
UENUM(BlueprintType)
enum class ${getEnumName(className)} : uint8 
{
${vars}
};
`;
}



function getReceiveHandlerTypeName(className: string) {
    return `F${getReceiveHandlerName(className)}`
}

function getReceiveHandlerName(className: string) {
    return `${className}_Handler`
}

/**
 * 给`UObject`加`U`的前缀
 * @param serviceClassName 
 * @returns 
 */
function serviceObjectName(serviceClassName: string) {
    return `U${serviceClassName}`;
}

//------------------- Service.h ---------------------------------------

//----------------- Recieve--------------------------
function makeReceiveDele(className: string, deles: string[]) {
    // DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLogin_S_Handler, FLogin_S, Data);
    deles.push(`DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(${getReceiveHandlerTypeName(className)}, F${className}, Data);\n`);
}

function makeReceiveHandler(className: string, handlers: string[]) {
    // UPROPERTY(BlueprintAssignable)
    // FLogin_S_Handler Login_S_Handler;
    handlers.push(`UPROPERTY(BlueprintAssignable)`);
    handlers.push(`${getReceiveHandlerTypeName(className)} ${getReceiveHandlerName(className)};`)
}

//------------------- Send---------------------------------
function makeSendFunDefine(className: string, channel: number, funcs: string[], sendRegs: string[]) {
    // UFUNCTION(BlueprintCallable)
    // void Login_C(FLogin_C _Login_C) const;
    funcs.push(`UFUNCTION(BlueprintCallable)`);
    let strChannel = `ENetChannel::Default`;
    if (channel > 0) {
        strChannel = `ENetChannel::Channel` + channel;
    }
    funcs.push(`void ${className}(F${className} _${className}, ENetChannel Channel = ${strChannel}) const;`)

    sendRegs.push(`RegSend(${UEConstString.PBCmdName}::${className}, F${className}::StaticStruct(), ${strChannel});`)
}

function getServiceHFileContent(createTime: string, path: string, serviceClassName: string, includes: string[], deles: string[], funcs: string[], handlers: string[], ModuleAPIName: string, NetCMDsPath: string) {

    return `#pragma once

#include "CoreMinimal.h"
#include "BaseNetProxy.h"
#include "${NetCMDsPath}/NetCMDs.h"
${includes.join("\n")}
#include "${serviceClassName}.generated.h"

${deles.join("\n")}

/**
 * 使用JunyouProtoTools，从 ${path} 生成
 * 生成时间 ${createTime}
 */
UCLASS(BlueprintType)
class ${ModuleAPIName}${serviceObjectName(serviceClassName)} : public UBaseNetProxy
{
	GENERATED_BODY()

public:
	virtual void RegReceiveHandlers() const override;

	${funcs.join("\n\t")}

	${handlers.join("\n\t")}

};`
}

function getInclude(className: string, pre = "", cdir: string) {
    if (className.startsWith("#include")) {
        return className;
    }
    if (classHelper && cdir) {
        //检查 className 
        return `#include "${pre}${classHelper.getInclude(className, cdir)}"`;
    } else {
        return `#include "${pre}${className}.h"`
    }
}

//------------------- Service.cpp ---------------------------------------
function makeRegs(className: string, regs: string[]) {
    // NetReg(Login_S, NetCMDs::Login_S)
    regs.push(`NetReg(${className}, ${UEConstString.PBCmdName}::${className})`)
}

function makeSendFunImpl(serviceClassName: string, className: string, implLines: string[]) {
    // NetSend(UAccountService, Login_C, NetCMDs::Login_C)
    implLines.push(`NetSend(${serviceObjectName(serviceClassName)}, ${className}, ${UEConstString.PBCmdName}::${className})`)
}

function getServiceCPPFileContent(serviceClassName: string, regs: string[], implLines: string[], sendRegs: string[]) {
    return `
#include "${serviceClassName}.h"

void ${serviceObjectName(serviceClassName)}::RegReceiveHandlers() const
{
	${regs.join("\n\t")}
    
    ${sendRegs.join("\n\t")}
}


${implLines.join("\n")}

`
}




function field2type(field: ProtoBuf.ProtoField, includes?: string[]): [string, MsgType, string | number, boolean, string] {
    let type = field.type;
    let isMsg = MsgType.NotMessage;
    let ttype: string | number;
    let def = field.options.default;
    if (def !== undefined) {
        let t = typeof def;
        if (t === "string") {
            def = `= "${def}"`;
        } else if (t === "object") {//不支持对象类型默认值
            def = "";
        } else {
            def = `= ${def}`;
        }
    }
    if (!def) {
        def = "";
    }
    switch (type) {
        case "int32":
        case "sint32":
        case "sfixed32":
            type = "int32";
            ttype = NSType.Int32;
            if (!def) {
                def = ` = 0`;
            }
            break;
        case "enum":
        case "fixed32":
        case "uint32":
            type = "uint32";
            ttype = NSType.Uint32;
            if (!def) {
                def = ` = 0`;
            }
        case "double":
            ttype = NSType.Double;
            if (!def) {
                def = ` = 0.0`;
            }
            break;
        case "float":
            ttype = NSType.Double;
            if (!def) {
                def = ` = 0.0`;
            }
            break;
        case "bool":
            ttype = NSType.Boolean;
            if (!def) {
                def = ` = false`;
            }
            break;
        case "bytes":
            type = "TArray<uint8>";
            ttype = NSType.Bytes;
            break;
        case "fixed64":
        case "sfixed64":
        case "int64":
        case "uint64":
        case "sint64":
            // 项目理论上不使用
            type = "int64";
            ttype = NSType.Int64;
            if (!def) {
                def = ` = 0`;
            }
            break;
        case "message":
            type = field.type;
            isMsg = MsgType.isAllMsg;
            ttype = `"${type}"`;
            break;
        case "string":
            type = "FString";
            ttype = NSType.String;
            break;
        case "object":
            type = "FJsonObjectWrapper";
            if (includes) {
                includes.pushOnce(`#include "JsonObjectWrapper.h"`);
            }
            ttype = `"FJsonObjectWrapper"`;
            break;
        default:
            if (includes) {
                includes.pushOnce(type)
            }
            type = GetStructName(type);
            isMsg = MsgType.isServerMsg;
            ttype = `"${type}"`;
            break;
    }
    if (field.rule == "repeated") { // 数组赋值
        return [`TArray<${type}>`, isMsg, ttype, true, ""];
    }
    return [type, isMsg, ttype, false, def];
}

function getVariable(field: ProtoBuf.ProtoField, variables: string[], includes: string[]): FieldData {
    let comment = field.comment;// 调整protobuf.js代码 让其记录注释
    let fname = field.name;
    let [fieldType, isMsg, tType, repeated, def] = field2type(field, includes);

    variables.push(`/**`);
    variables.push(` * ${fname}是否有值`);
    variables.push(` */`);
    variables.push(`UPROPERTY(BlueprintReadOnly)`);
    variables.push(`bool Has${fname} = false;`);

    variables.push(`/**`);
    variables.push(` * ${comment}`);
    variables.push(` */`);
    variables.push(`UPROPERTY(BlueprintReadWrite)`);
    variables.push(`${fieldType} ${fname}${def};`);

    return { fieldName: fname, fieldType, isMsg, tType, repeated };
}

window.ClientProxy = {
    requestAll,
    request,
    parseProto
}