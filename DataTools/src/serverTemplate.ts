
export interface ServerCodeMaker {
    addDefine(define: ProDefine);
    flash(): string;
    /**
     * 初始化
     */
    init(fileName: string, path: string, cfg: GlobalCfg);
}

export const WallanServerCodeMaker = {
    init,
    addDefine,
    flash,
}

const getPros = [] as string[];
const setPros = [] as string[];
const descs = [] as string[];
let _fileName: string;
let _cfg: GlobalCfg;
let _path: string;

function addDefine(define: ProDefine, checker: TypeChecker) {
    getPros.push(`private ${checker.javaType} ${define.name};`);
    getPros.push(`/**`);
    descs.forEach(line => {
        getPros.push(` * ${line}  `);
    });
    getPros.push(` */`);
    getPros.push(`public ${checker.javaType} get${getJavaName(define.name)}() {`);
    getPros.push(`\treturn ${define.name};`);
    getPros.push(`}`);
    setPros.push(`public void set${getJavaName(define.name)}(${checker.javaType} ${define.name}) {`);
    setPros.push(`\tthis.instance.${define.name} = ${define.name};`);
    getPros.push(`}`);
}

function flash() {
    let createTime = new Date().format("yyyy-MM-dd HH:mm:ss");
    let className = `${getJavaName(_fileName)}Config`;
    return `
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;

/**
 * 由[H5Tools](https://github.com/eos3tion/H5Tools)数据生成工具，从"${_path}"生成
 * 创建时间：${createTime}
 **/
@JsonDeserialize(builder = ${className}.Builder.class)
public class ${className} {
\t${getPros.join(`\n\t`)}
\t@JsonPOJOBuilder(withPrefix = "set")
\tpublic static class Builder {
\t${className} instance = new ${className}();
\t\t${setPros.join(`\n\t`)}
\t\tpublic ${className} build(){
\t\t\treturn this.instance;
\t\t}
\t}
}`

}

function init(fileName: string, path: string, cfg: GlobalCfg) {
    getPros.length = descs.length = 0;
    _fileName = fileName;
    _cfg = cfg;
    _path = path;
}

function getJavaName(name: string) {
    return name[0].toUpperCase() + name.substr(1);
}
