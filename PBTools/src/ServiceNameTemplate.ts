const fs: typeof import("fs") = nodeRequire("fs");
const regValue = /\s*([A-Z][a-zA-Z_$0-9]+),?\s*?\n/g;
/**
 * 客户端前缀
 */
const clientPrefix = `declare const enum ${ConstString.ServiceName} {\n\t$ = 0,\n\t`;

/**
 * 用于创建服务名字的常量文件
 * 
 * @export
 * @class ServiceNameTemplate
 */
export default class ServiceNameTemplate {
    public addToFile(file: string, serviceName: string) {
        let names: string[] = [];
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return this.addContent(serviceName, names);
        }
        let content = fs.readFileSync(file, "utf8");
        regValue.lastIndex = 0;
        while (true) {
            let res = regValue.exec(content);
            if (res) {
                names.pushOnce(res[1]);
            } else {
                break;
            }
        }
        return this.addContent(serviceName, names);
    }

    private addContent(serviceName: string, names: string[]) {
        let code = clientPrefix;
        names.pushOnce(serviceName);
        names.sort((a, b) => a > b ? 1 : -1);
        code += names.join(",\n\t");
        code += "\n}";
        return code;
    }
}