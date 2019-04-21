import _fs = require("fs");
const fs: typeof _fs = nodeRequire("fs");
const regValue = new RegExp(`(\/\\*([a-zA-Z_0-9]+)\\*\/\\d+\\s*:\\s*({.*?}|${ConstString.PBDictKeyName}\\.([a-zA-Z_0-9]+))),?`, "g");
/**
 * 服务端前缀
 */
const serverPrefix = "export = {\n";
/**
 * 客户端前缀
 */
const clientPrefix = `const ${ConstString.PBDictName} = {\n`;

/**
 * 分组的开始
 */
const GroupStart = /[/][/]↓↓↓↓↓[ ](.*?)[ ]↓↓↓↓↓/g;

/**
 * 分组的结束
 */
const GroupEnd = /[/][/]↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑/g;

const pbstart = /\*\/\d+/g;
const pbend = /\d+/g;

const defaultPbinx = 30;

let maxInx = 0;

/**
 * 
 * 用于创建服务端用的消息字典的常量文件
 * @export
 * @class PBMsgDictTemplate
 */
export default class PBMsgDictTemplate {

    public addToFile(file: string, dict: { [index: string]: string }, isServer: boolean, url: string, pbindex?: number) {
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            return this.addContent(dict, isServer, url);
        }
        let content = fs.readFileSync(file, "utf8");
        let lines = content.split(/\n|\r\n/);
        let groups: MsgGroup[] = [];
        let groupDict: { [index: string]: MsgGroup } = {};
        let keyDict: { [index: string]: CfgBin } = {};

        let cGroup: MsgGroup;
        let errors: string[];
        maxInx = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            let line = lines[i];
            //检查是不是数据
            regValue.lastIndex = 0;
            let result = regValue.exec(line);
            if (result) {//是数据
                if (!cGroup) {
                    cGroup = new MsgGroup;
                    groups.push(cGroup);
                }
                if (cGroup.start === undefined) {
                    cGroup.start = i;
                }

                let key = result[2];
                if (key in keyDict) {
                    errors.push(key);
                }
                // 开始解析数据
                let v = <CfgBin>{};
                v.key = key;
                let parentKey = result[4];
                if (parentKey) {
                    v.parentKey = parentKey;
                } else {
                    v.value = result[3];
                }
                v.line = i;
                v.group = cGroup;
                keyDict[key] = v;
                cGroup.list.set(key, v);
            } else {
                GroupStart.lastIndex = 0;
                result = GroupStart.exec(line);
                if (result) {//是起始行
                    if (cGroup) {
                        if (!cGroup.end) {
                            cGroup.end = i - 1;
                        }
                    }
                    cGroup = new MsgGroup;
                    cGroup.url = result[1];
                    groupDict[cGroup.url] = cGroup;
                    groups.push(cGroup);
                    cGroup.start = i;
                    let nextline = lines[i + 1];
                    pbstart.lastIndex = 0;
                    let indx1 = pbstart.exec(nextline);
                    if (indx1) {
                        let tmp = indx1[0];
                        pbend.lastIndex = 0;
                        let indx2 = pbend.exec(tmp);
                        if (indx2) {
                            let inx = +indx2[0];
                            cGroup.pbindex = inx;
                            if (inx > maxInx) {
                                maxInx = inx;
                            }
                        }
                    }


                } else {
                    GroupEnd.lastIndex = 0;
                    result = GroupEnd.exec(line);
                    if (result) {//是结束行
                        if (cGroup) {
                            cGroup.end = i;
                            cGroup = undefined;
                        }

                    }
                }
            }
        }
        if (maxInx == 0) {
            maxInx = defaultPbinx;
        }



        //为了防止 parentKey被删除，先将数据基于parentKey还原
        for (let key in keyDict) {
            let bin = keyDict[key];
            let parentKey = bin.parentKey;
            if (parentKey) {
                bin.value = keyDict[parentKey].value;
            }
        }

        return this.addContent(dict, isServer, url, { groups, groupDict, keyDict, errors }, pbindex);
    }

    private addContent(dict: { [index: string]: string }, isServer: boolean, url: string, data?: { groups: MsgGroup[], groupDict: { [index: string]: MsgGroup }, keyDict: { [index: string]: CfgBin }, errors: string[] }, pbindex?: number) {
        let group: MsgGroup;
        let gs: MsgGroup[], kd: { [index: string]: CfgBin };
        if (data) {
            const { groups, groupDict, keyDict, errors } = data;
            // 找到原 group
            group = groupDict[url];

            kd = keyDict;
            gs = groups;
        } else {
            gs = [];
            kd = {};
        }
        if (group) {
            //干掉老数据，用新的页面数据
            group.list.clear();
        }
        else {
            group = new MsgGroup();
            group.url = url;
            if (pbindex) {
                if (group.pbindex === undefined) {
                    group.pbindex = pbindex;
                }
            } else {
                pbindex = group.pbindex = maxInx + 100;
            }
            gs.push(group);
        }

        for (let k in dict) {
            let bin = <CfgBin>{};
            bin.key = k;
            let value = dict[k];
            let v = kd[k];
            if (v) {//防止把某个PBMsg消息迁移到其他页面
                v.group.list.delete(k);
                kd[k] = bin;
            }
            bin.value = value;
            bin.group = group;
            group.list.set(k, bin);
        }

        gs.sort((a, b) => {
            return a.pbindex > b.pbindex ? 1 : -1;
        });
        // gs.sort((a, b) => {
        //     return a.url > b.url ? 1 : -1;
        // });

        let consts = [`const enum ${ConstString.PBDictKeyName} {`];
        let param = {
            keyIndex: 30,//从30开始作为PBDict的key，前面的key用于 基础数据类型
            consts,
            valueDict: {}
        }
        let arr = gs.map(group => group.toString(param));
        consts.push(`}`);
        let code = consts.join(`\n`) + "\n";
        code += isServer ? serverPrefix : clientPrefix;
        code += arr.join(`\n`);
        code += "\n}";
        return code;
    }
}

interface CfgBin {
    key: string;
    /**
     * 数据
     * { 1: ["id", 3, 3] }
     * @type {string}
     * @memberof CfgBin
     */
    value: string;
    /**
     * 如果数据使用形式如下
     * `/\*AoiMonstersLeave_S2C_Msg\* /11: PBDictKey.AoiNpcsEnter_S2C_Msg,`   
     * 则 `parentKey` 的值为 `AoiNpcsEnter_S2C_Msg`  
     * `AoiMonstersLeave_S2C_Msg`的实际数据会使用`AoiNpcsEnter_S2C_Msg`中的数据
     * @type {string}
     * @memberof CfgBin
     */
    parentKey: string;
    /**
     * 行数
     * 
     * @type {number}
     * @memberOf CfgBin
     */
    line: number;
    group: MsgGroup;
}

/**
 * 消息分组
 * 
 * @class MsgGroup
 */
class MsgGroup {
    /**
     * 生成的路径
     * 
     * @type {string}
     * @memberOf MsgGroup
     */
    url: string;
    /**
     * 
     * 分组中的索引
     * @type {Map<string,CfgBin>}
     * @memberOf MsgGroup
     */
    list: Map<string, CfgBin> = new Map();
    /**
     * 内容的起始索引
     * 
     * @type {number}
     * @memberOf MsgGroup
     */
    start: number;
    /**
     * 内容的结束索引
     * 
     * @type {number}
     * @memberOf MsgGroup
     */
    end: number;

    pbindex: number;

    public toString(param: { keyIndex: number, consts: string[], valueDict: { [value: string]: string } }) {
        if (!this.list.size) {
            return "";
        }
        let { keyIndex, consts, valueDict } = param;
        keyIndex = this.pbindex;
        let list: CfgBin[] = [];
        this.list.forEach(v => { list.push(v) });
        list.sort((a, b) => a.key > b.key ? 1 : -1);
        let arr: string[] = [];
        //创建 key列表

        list.forEach((item, idx) => {
            let { value, key } = item;
            let parentKey = valueDict[value];
            consts.push(`\t${key} = ${keyIndex},`);
            let v: string;
            if (parentKey) {
                v = `${ConstString.PBDictKeyName}.${parentKey}`;
            } else {
                valueDict[value] = key;
                v = value;
            }
            arr[idx] = `\t/*${key}*/${keyIndex}: ${v},`;
            keyIndex++;
        });
        param.keyIndex = keyIndex;
        let contents = arr.join(`\n`);
        let url = this.url;
        if (url) {
            return `\t//↓↓↓↓↓ ${url} ↓↓↓↓↓
${contents}
\t//↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑`
        } else {
            return contents;
        }
    }
}