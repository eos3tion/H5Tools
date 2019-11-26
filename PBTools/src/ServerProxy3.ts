import CookieForPath from "./CookieForPath";
import * as _cp from "child_process";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import * as _url from "url";
import * as _http from "http";
import ServerProxy2 from "ServerProxy2";
import { checkCmdIsOK, exec, execAsync } from "./exec";
import { checkAndDownloadFile } from "./DownloadFile";



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
    ProtoFilePath = "proto/game.proto",
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
export default class ServerProxy extends ServerProxy2 {

    private _jarPath: string;
    private _protocPath: string;

    protected async preCheck(cookieForPath: CookieForPath) {
        //检查
        sPath = cookieForPath.setPathCookie("txtServerHttp", false, false);
        const fs: typeof _fs = nodeRequire("fs");
        if (!sPath || !fs.existsSync(sPath)) {
            return alert(`服务器端的源码基础路径[${sPath}]不存在`);
        }
        //检查javac能否正常执行
        if (!checkCmdIsOK("javac", ["-version"])) {
            return alert("javac无法正常执行，请检查jdk是否正常安装，检查环境变量是否设置正常");
        }
        //由于jar.exe并无类似`-version`的指令，可正常返回状态0，默认 javac 有则 jar 可正常执行
        //检查/下载
        try {
            this._protocPath = await checkAndDownloadFile(Const.ProtocPath, Const.ProtocPath);
        } catch (e) {
            return alert(`${Const.ProtocPath}下载失败，请检查网络`)
        }

        try {
            this._jarPath = await checkAndDownloadFile(Const.ProtocJarPath, Const.ProtocJarPath);
        } catch (e) {
            return alert(`${Const.ProtocJarPath}下载失败，请检查网络`)
        }
        return true;
    }


    protected async sovleData(linkDict: { [index: string]: Page }) {
        const _progress = this._progress;
        _progress.addTask();
        //生成proto文件
        ProtoFile.start();
        ClientPBParser.start();
        ClientCmdType.start();
        for (let name in linkDict) {
            const page = linkDict[name];
            ProtoFile.add(page.content);
            const cmds = page.cmds;
            for (let cmd in cmds) {
                const cmdInfo = cmds[cmd];
                let icmd = +cmd;
                let name = cmdInfo.name;
                ClientPBParser.add(icmd, name);
                ClientCmdType.add(icmd, name);
            }
        }


        const path: typeof _path = nodeRequire("path");
        const fs: typeof _fs = nodeRequire("fs");
        const basePath = path.join(this._appTmpPath, Const.TempPath);
        //输出proto文件到临时目录
        if (fs.existsSync(basePath)) {//先删除全部文件
            FsExtra.remove(basePath);
        }
        FsExtra.mkdirs(basePath);
        let protoContent = ProtoFile.flush();
        //将文件写入指定文件
        FsExtra.writeFileSync(path.join(basePath, Const.ProtoFilePath), protoContent);
        let javaPath = path.join(basePath, Const.JavaFileBase);
        FsExtra.mkdirs(javaPath);
        //执行protoc编译成java文件
        await execAsync({ cmd: this._protocPath, cwd: basePath }, `--java_out=${Const.JavaFileBase}/`, Const.ProtoFilePath);
        _progress.endTask();

        //基于JavaFileBase 找到所有生成的java文件
        let javaFiles = [] as string[];
        FsExtra.walkDirs(javaPath, file => {
            javaFiles.push(file);
        });
        let classesPath = path.join(basePath, Const.ClassFileBase)
        FsExtra.mkdirs(classesPath);
        //将java文件，编译成class
        await execAsync({ cmd: "javac", cwd: basePath }, "-encoding", "UTF-8", "-classpath", this._jarPath, "-d", Const.ClassFileBase, ...javaFiles);
        _progress.endTask();

        let jarOutput = path.join(sPath, Const.ProtoJarOutput);
        //检查文件夹路径是否存在
        let jarPath = path.dirname(jarOutput);
        if (!fs.existsSync(jarPath)) {
            FsExtra.mkdirs(jarPath);
        }

        //将class文件打成jar包
        await execAsync({ cmd: "jar", cwd: classesPath }, "cf", jarOutput, ".");
        _progress.endTask();

        //生成ClientCmdType.java
        let javaFile = path.join(sPath, Const.ClientCmdTypePath);
        FsExtra.writeFileSync(javaFile, ClientCmdType.flush());
        window.log(`生成文件${javaFile}`)
        _progress.endTask();

        //生成ClientPBParser.java
        javaFile = path.join(sPath, Const.ClientPBParserPath);
        FsExtra.writeFileSync(javaFile, ClientPBParser.flush());
        window.log(`生成文件${javaFile}`)
        _progress.endTask();
        return null
    }
}

module ProtoFile {
    const messages = [] as string[];
    export function start() {
        messages.length = 0;
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
option java_package = "${Const.ProtoJavaPackage}";`
            + messages.join("\n");
    }
}


module ClientPBParser {

    const CmdLines = [] as string[];

    export function start() {
        CmdLines.length = 0;
    }

    export function add(_cmd: number, name: string) {
        CmdLines.push(`PB_PARSER.put(ClientCmdType.${name},${name}.PARSER);`);
    }

    export function flush() {
        return `package ${Const.ProtoJavaPackage};
import com.junyou.bus.common.cmd.ClientCmdType;
import com.google.protobuf.InvalidProtocolBufferException;
import java.util.HashMap;
import java.util.Map;
import com.google.protobuf.Parser;
import com.junyou.analysis.ServerInfoConfigManager;
import ${Const.ProtoJavaPackage}.Game.*;

public class ClientPbParser {
    private static final Map<Integer, Parser<?>>PB_PARSER = new HashMap<>();
    public static Object parse(int cmd, byte[] bytes) throws InvalidProtocolBufferException {
        try {
            return PB_PARSER.get(cmd).parseFrom(bytes);
        } catch(InvalidProtocolBufferException e) {
            throw new RuntimeException(e);
        }
    }
    static {
        addGMCMD();
`
            + CmdLines.join("\n")
            + `}
    private static void addGMCMD() {
        if(ServerInfoConfigManager.getInstance().getServerInfoConfig().isGmOpen()){
			PB_PARSER.put(ClientCmdType.DebugCmd_C,DebugCmd_C.PARSER);
			PB_PARSER.put(ClientCmdType.DebugCmd_S,DebugCmd_S.PARSER);
		}
    }
}`
    }
}

module ClientCmdType {
    const lines = [] as string[];
    export function start() {
        lines.length = 0;
    }

    export function add(cmd: number, name: string) {
        lines.push(`\tpublic final static int ${name} = ${cmd};`);
    }

    export function flush() {
        return `package com.junyou.bus.common.cmd;
import java.util.HashMap;
import java.util.Map;
import java.lang.reflect.Field;

public class ClientCmdType {
    /***debug gm command****/
    public final static int DebugCmd_C = 32767; 
    public final static int DebugCmd_S = 32766;
` + lines.join("\n") +
            `
	static {
        try {
            Field[] fields = ClientCmdType.class.getDeclaredFields();
            Map<Object, String> fieldValues = new HashMap<>();
            for (Field f : fields) {
                String name = f.getName();
                Object value = f.get(null);
                if (fieldValues.containsKey(value)) {
                    throw new Exception("ClientCmdType Attribute value repetition :" + name + "<->" + fieldValues.get(value));
                } else {
                    fieldValues.put(value, name);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}`
    }
}