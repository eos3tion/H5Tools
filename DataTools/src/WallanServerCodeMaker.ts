import { getManualCodeInfo, genManualAreaCode } from "./MenualCodeHelper.js";
const path: typeof import("path") = nodeRequire("path");

const getPros = [] as string[];
const setPros = [] as string[];
let _cfg: GlobalCfg;
let _fcfg: FileConfig;
let sdict: { [index: string]: string };
let _outFilePath: string;
let _pathSPackage: string;
let className: string;

function addProperty(define: ProDefine, checker: TypeChecker, descs: string[]) {
    getPros.push(`private ${checker.javaType} ${define.name};`);
    getPros.push(`/**`);
    descs.forEach(line => {
        getPros.push(` * ${line}  `);
    });
    const funName = getJavaName(define.name);
    getPros.push(` */`);
    getPros.push(`public ${checker.javaType} get${funName}() {`);
    getPros.push(`\treturn ${define.name};`);
    getPros.push(`}`);
    setPros.push(`public void set${funName}(${checker.javaType} ${define.name}) {`);
    setPros.push(`\tthis.instance.${define.name} = ${define.name};`);
    setPros.push(`\t${genManualAreaCode(`$set${funName}`, sdict, `\t\t`)}`);
    setPros.push(`}`);
}

function flash() {
    let createTime = new Date().format("yyyy-MM-dd HH:mm:ss");
    let { sfilePackage, sInterfaces, sSuper } = _fcfg;
    let packageStr = sfilePackage.replace(/\//g, ".");
    // 生成服务端代码
    if (setPros.length || getPros.length) {
        return {
            code:
                `${packageStr ? `package ${packageStr};` : ""}
${genManualAreaCode("$area1", sdict)}
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;

${genManualAreaCode("$area2", sdict)}

/**
 * 由[H5Tools](https://github.com/eos3tion/H5Tools)数据工具生成，从"${_fcfg.path}"生成
 * 创建时间：${createTime}
 */
@JsonDeserialize(builder = ${className}.Builder.class)
public class ${className}${sSuper ? " extends " + sSuper : ""}${sInterfaces.length ? " implements " + sInterfaces.join(",") : ""} {
\t${getPros.join(`\n\t`)}
\t${genManualAreaCode("$area3", sdict, `\t`)}
\t@JsonPOJOBuilder(withPrefix = "set")
\tpublic static class Builder {
\t\t${genManualAreaCode("$area4", sdict, `\t\t`)}
\t\t${className} instance = new ${className}();
\t\t${setPros.join(`\n\t`)}
\t\tpublic ${className} build(){
\t\t\treturn this.instance;
\t\t}
\t}
}`,
            path: _outFilePath,
            packagePath: _pathSPackage,
            className
        }

    }
}

function init(fcfg: FileConfig, cfg: GlobalCfg) {
    _outFilePath = getFilePath(fcfg);
    sdict = getManualCodeInfo([_outFilePath]);
    getPros.length = 0;
    setPros.length = 0;
    _fcfg = fcfg;
    _cfg = cfg;
}

function getFilePath(fcfg: FileConfig) {
    let { sfilePackage, name, sPath } = fcfg;
    _pathSPackage = sfilePackage.replace(/\./g, "/");
    className = `${getJavaName(name)}${Suffix.Server}`;
    return path.join(sPath, _pathSPackage, `${className}${Ext.ServerCode}`)
}

function getJavaName(name: string) {
    return name[0].toUpperCase() + name.substr(1);
}

window.serverCodeMaker = {
    init,
    addProperty,
    flash,
}