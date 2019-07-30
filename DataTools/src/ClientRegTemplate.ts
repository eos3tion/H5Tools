const regCfg = /rP[(]"([a-zA-Z_0-9]+)"\s*,\s*([a-zA-Z_0-9.]+)(?:\s*,\s*("[a-zA-Z_0-9.]*"|0))?(?:\s*,\s*([0-9]))?[)];/g;
// const extCfg = /rE[(]C[.]([a-zA-Z_0-9]+)[)];/g
var fs = nodeRequire("fs");

export default class ClientRegTemplate {
    /**
    * 添加数据到文件
    * 
    * @param {string} file (description)
    * @param {string} key (description)
    * @return [{string} 错误描述,{string} 生成的代码]
    */
    public addToFile(file: string, fnames: Map<string, ConfigKeyBin>, pak: string, useBin?: boolean, useESModule?: boolean) {
        let regDic: Map<string, string> = new Map();
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return ["无法找到文件", this.addContent(fnames, regDic, pak, useBin, useESModule)];
        }
        let content = fs.readFileSync(file, "utf8");
        regCfg.lastIndex = 0;
        while (true) {
            let res = regCfg.exec(content);
            if (res) {
                regDic.set(res[1], res[0]);
            } else {
                break;
            }
        }
        return [null, this.addContent(fnames, regDic, pak, useBin, useESModule)];
    }


    private addContent(fnames: Map<string, ConfigKeyBin>, regDic: Map<string, string>, pak: string, useBin?: boolean, useESModule?: boolean) {
        let lines = useESModule ?
            [`export function initData(rP: Function) {`]
            :
            [`namespace ${pak} {`,
                `\texport function initData() {`,
            useBin ? `\t\tvar rP = DataLocator.regBytesParser;` : `\t\tvar rP = DataLocator.regCommonParser;`];
        let tmp: string[] = [];
        for (let k of regDic.keys()) {
            let bin = fnames.get(k);
            if (bin) {
                tmp.push(k);
                parseBin(bin, k, lines);
            } else {
                lines.push(`\t\t${regDic.get(k)}`);
            }
        }
        fnames.forEach((bin, key) => {
            if (!~tmp.indexOf(key) && bin.fname) {
                parseBin(bin, key, lines);
            }
        });
        lines.push(`\t}`)
        if (!useESModule) {
            lines.push(`}`);
        }
        return lines.join("\n");
    }


}
function parseBin(bin: ConfigKeyBin, key: string, lines: string[]) {
    if (bin.fname) {
        let cls = bin && bin.isClass && bin.fname && `${bin.fname}Cfg` || 0;
        let mainKey = bin.mainKey;
        if (mainKey) {
            if (bin.type == CfgDataType.ArraySet) {
                mainKey = `, "${mainKey}", ${CfgDataType.ArraySet}`;
            } else {
                if (mainKey == "id") {
                    mainKey = ``;
                } else {
                    mainKey = `, "${mainKey}"`;
                }
            }
        } else {
            mainKey = `, 0`;
        }
        lines.push(`\t\trP("${key}", ${cls}${mainKey});`);
    }
}