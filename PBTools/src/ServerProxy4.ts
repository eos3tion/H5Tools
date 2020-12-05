import * as _cp from "child_process";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import * as _url from "url";
import * as _http from "http";
import ServerProxy3 from "ServerProxy3";
import { execAsync } from "./exec";
import { progress, log } from "./Helper";
import { IndexResult } from "./GitlabHelper";
import { saveCommonProto } from "./OptionProtoHead";

const path: typeof _path = nodeRequire("path");
const fs: typeof _fs = nodeRequire("fs");


const enum Const {
    /**
     * proto文件路径
     */
    ProtoFilePath = "proto",
}


let sPath = "";
//使用git拉取gitlab wiki数据，进行生成
export default class ServerProxy extends ServerProxy3 {



    protected async sovleData({ pages: linkDict, globalRefs }: IndexResult) {

        const { basePath, sPath, javaProtoPackage, cmdFullPath } = this;
        //1.遍历所有页面，得到完整引用字典
        let protoBasePath = this.protoBasePath || basePath;

        const protoSavePath = path.join(protoBasePath, Const.ProtoFilePath);
        //生成附加文件
        saveCommonProto(protoSavePath, `package ${javaProtoPackage};`);

        ClientCmdType.start();
        //生成proto文件
        for (let name in linkDict) {
            ProtoFile.start();
            const page = linkDict[name];
            const { impRefNames, cmds, protoContent } = page;

            for (let i = 0; i < impRefNames.length; i++) {
                const impName = impRefNames[i];
                let ref = globalRefs[impName];
                if (!ref) {
                    throw Error(`页面[${page.rawName}]引用的[${impName}]，无法在其他页面找到对应的proto定义`)
                }
                ProtoFile.addImport(ref.page.name);
            }


            ProtoFile.add(protoContent);
            for (let cmd in cmds) {
                const cmdInfo = cmds[cmd];
                let icmd = +cmd;
                let name = cmdInfo.name;
                ClientCmdType.add(icmd, name);
            }

            let protoCnt = ProtoFile.flush(javaProtoPackage);
            //将文件写入指定文件
            FsExtra.writeFileSync(path.join(protoSavePath, page.name + ".proto"), protoCnt);
        }

        if (!this.sPath) {
            return
        }
        for (let name in linkDict) {
            //编译proto文件
            await this.compileProto(name, protoBasePath);
            progress.endTask();
        }

        if (this.lan == "java") {
            //生成ClientCmdType.java
            let { className: cmdClassName, packageName: cmdPackageName } = this.parseFullClassName(cmdFullPath);
            let javaFile = path.join(sPath, ...cmdPackageName.split("."), cmdClassName + ".java");
            FsExtra.writeFileSync(javaFile, ClientCmdType.flush(cmdPackageName, cmdClassName));
            log(`生成文件${javaFile}`)
        }
    }

    private async compileProto(name: string, protoBasePath: string) {
        let javaPath = this.sPath;
        FsExtra.mkdirs(javaPath);
        //执行protoc编译成java文件
        await execAsync({ cmd: this._protocPath, cwd: protoBasePath }, `--${this.lan}_out=${javaPath}/`, `--proto_path=./${Const.ProtoFilePath}`, `${Const.ProtoFilePath}/${name}.proto`);
    }
}

module ProtoFile {
    const messages = [] as string[];
    const imports = [] as string[];
    export function start() {
        messages.length = 0;
        imports.length = 0;
    }

    export function addImport(importPage: string) {
        imports.pushOnce(`import "${importPage}.proto";`);
    }

    export function add(message: string) {
        messages.push(message);
    }

    export function flush(protoPakcage: string) {
        //         return `syntax = "proto2";
        // package ${Const.ProtoJavaPackage};
        // option java_package = "${Const.ProtoJavaPackage}";
        // message DebugCmd_C{
        // 	repeated string args=1;//gm指令的参数列表
        // }
        // message DebugCmd_S{
        // 	optional Code code=1;
        // }
        // `+ messages.join("\n");
        return `syntax = "proto2";
package ${protoPakcage};
import "wallan.proto";
${imports.join(`\n`)}
option java_package = "${protoPakcage}";

${messages.join("\n")}
`
    }
}

module ClientCmdType {
    const lines = [] as string[];
    export function start() {
        lines.length = 0;
    }

    export function addArea(msg: string) {
        lines.push(`\n\n\t//------------${msg}-------------`);
    }

    export function add(cmd: number, name: string) {
        lines.push(`\tpublic final static int ${name} = ${cmd};`);
    }

    export function flush(cmdPackage: string, cmdClass: string) {
        return `package ${cmdPackage};
public class ${cmdClass} {
` + lines.join("\n")
            + "\n}"
    }
}