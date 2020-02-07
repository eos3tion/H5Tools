import CookieForPath from "./CookieForPath";
import * as _cp from "child_process";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import * as _url from "url";
import * as _http from "http";
import ServerProxy3 from "ServerProxy3";
import { execAsync } from "./exec";

const path: typeof _path = nodeRequire("path");
const fs: typeof _fs = nodeRequire("fs");


const enum Const {
    /**
     * protoc文件下载路径
     */
    ProtocPath = "proto/protoc.exe",
    /**
     * protobuf的jar包路径
     */
    ProtocJarPath = "proto/protobuf-java-3.7.0.jar",

    /**
     * 基础路径
     */
    TempPath = "protoTmp",
    /**
     * proto文件的名字
     */
    ProtoFileName = "Game",
    /**
     * proto文件路径
     */
    ProtoFilePath = "proto",
    /**
     * proto生成java的初始路径
     */
    JavaFileBase = "src",

    ProtoJavaPackage = "com.wallan.protobuf",
    /**
     * 编译出的classes的基础路径
     */
    ClassFileBase = "classes",
    /**
     * 输出的jar包路径
     */
    ProtoJarOutput = "lib/proto.jar",

    ClientCmdTypePath = "bus/com/junyou/bus/common/cmd/ClientCmdType.java",

    ClientPBParserPath = "common/com/junyou/common/protobuf/ClientPbParser.java",
}


let sPath = "";
//使用git拉取gitlab wiki数据，进行生成
export default class ServerProxy extends ServerProxy3 {



    protected async sovleData(linkDict: { [index: string]: Page }) {
        const _progress = this._progress;
        _progress.addTask();

        //1.遍历所有页面，得到完整引用字典
        const globalRefs = {} as ProtoRefDict;

        for (let name in linkDict) {
            const page = linkDict[name];
            let refs = page.refs;
            if (refs) {
                for (let refName in refs) {
                    const ref = refs[refName];
                    let tester = globalRefs[refName];
                    if (tester) {
                        throw Error(`页面[${tester.page.rawName}]和[${page.rawName}]出现了相同的message名称[${refName}]`)
                    }
                    globalRefs[refName] = ref;
                }
            }
        }

        const protoSavePath = path.join(this.basePath, Const.ProtoFilePath);


        //生成proto文件
        for (let name in linkDict) {
            ProtoFile.start();
            const page = linkDict[name];
            const { impRefNames, cmds, content } = page;

            for (let i = 0; i < impRefNames.length; i++) {
                const impName = impRefNames[i];
                let ref = globalRefs[impName];
                if (!ref) {
                    throw Error(`页面[${page.rawName}]引用的[${impName}]，无法在其他页面找到对应的proto定义`)
                }
                ProtoFile.addImport(ref.page.name);
            }


            ClientCmdType.start();
            ProtoFile.add(content);
            for (let cmd in cmds) {
                const cmdInfo = cmds[cmd];
                let icmd = +cmd;
                let name = cmdInfo.name;
                ClientCmdType.add(icmd, name);
            }

            //将文件写入指定文件
            FsExtra.writeFileSync(path.join(protoSavePath, page.name + ".proto"), ProtoFile.flush());

        }
        for (let name in linkDict) {
            //编译proto文件
            await this.compileProto(name);
        }

        return null
    }

    private async compileProto(name: string) {
        let basePath = this.basePath;
        let javaPath = path.join(basePath, Const.JavaFileBase);
        FsExtra.mkdirs(javaPath);
        //执行protoc编译成java文件
        await execAsync({ cmd: this._protocPath, cwd: basePath }, `--java_out=${Const.JavaFileBase}/`, `--proto_path=./${Const.ProtoFilePath}`, `${Const.ProtoFilePath}/${name}.proto`);
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

    export function flush() {
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
package ${Const.ProtoJavaPackage};
${imports.join(`\n`)}
option java_package = "${Const.ProtoJavaPackage}";

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
        lines.push(`\tpublic final static Integer ${name} = ${cmd};`);
    }

    export function flush() {
        return `package ${Const.ProtoJavaPackage};
public class ClientCmdType {
    /***debug gm command****/
    public final static Integer DebugCmd_C = 32767; 
    public final static Integer DebugCmd_S = 32766;
` + lines.join("\n")
            + "\n}"
    }
}