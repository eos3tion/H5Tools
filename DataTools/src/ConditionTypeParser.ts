const enum RawOP {
    /**
     * 具体值
     */
    Value = 1,
    BracketsMask = 0b100000000000,
    /**
     * 括号
     */
    Brackets = BracketsMask | 0,
    /**
     * 函数
     */
    Function = BracketsMask | 1,
    /**
     * 比较  
     * = > < <> >= <=
     */
    Comperation = 2,
    /**
     * 条件标识
     */
    TiaoJianKey = 3,
}


interface Node {
    parent: Node;
    op: number;
    nodes: Node[];
    value: string;
    /**
     * 原始内容
     */
    raw: string;
    /**
     * 起始索引
     */
    start: number;
    /**
     * 结束索引
     */
    end: number;
    close?: boolean;
}


const Comparations =
    ["=", "<", ">"];
export interface TiaoJianCfg {
    id: number;
    key: string;
    min: number;
    max: number;
    layer: string;
}

let tiaojian: { [key: string]: TiaoJianCfg };
let _supportedFunctions: string[];
let _tiaojianPath: string;

export function loadTiaoJian(gcfg: GlobalCfg) {
    const path: typeof import("path") = nodeRequire("path");
    const fs: typeof import("fs") = nodeRequire("fs");
    let { tiaojian: tiaojianPath, tiaojianFuncs } = gcfg;
    _tiaojianPath = tiaojianPath;
    tiaojian = null;
    if (tiaojianPath && fs.existsSync(tiaojianPath)) {
        let msg = fs.readFileSync(tiaojianPath, "utf8");
        let list: TiaoJianCfg[];
        try {
            list = JSON.parse(msg);
        } catch (e) {
            throw Error(`[tiaojian]配置，${tiaojianPath}中的数据不是JSON，无法解析`)
        }
        let len = list.length;
        if (len > 0) {
            tiaojian = {};
            for (let i = 0; i < len; i++) {
                const cfg = list[i];
                tiaojian[cfg.key] = cfg;
            }
        }
    }
    if (tiaojianFuncs) {
        _supportedFunctions = tiaojianFuncs.map(v => v.toLowerCase());
    }
}

export function decode(content: string) {
    if (!content) {
        return
    }
    let pos = 0;
    let len = content.length;
    let nod = {
        raw: content.trim(),
        start: pos,
        end: len,
        nodes: []
    } as Node;
    let root = nod;
    while (pos < len) {
        let char = content.charAt(pos);
        if (char == "(") {
            let raw = content.substring(nod.start, pos);
            let func = raw.trim();
            let node = {
                start: pos + 1,
                nodes: [],
                parent: nod
            } as Node;
            nod.nodes.push(node);
            if (func) {
                nod.op = RawOP.Function;
                nod.value = func.toLowerCase();
            } else {
                nod.op = RawOP.Brackets;
            }
            nod = node;
        } else if (char == ",") {
            let raw = content.substring(nod.start, pos);
            nod.end = pos;
            nod.raw = raw;
            if (!nod.op) {
                nod.op = RawOP.Value;
                nod.value = raw;
            }
            let value = raw.trim();
            do {
                nod = nod.parent;
            } while (nod && !isBrackedsType(nod.op))
            let node = {
                start: pos + 1,
                nodes: [],
                parent: nod,
                raw,
                value,
            } as Node;
            nod.nodes.push(node);
            nod = node;
        } else if (Comparations.indexOf(char) > -1) {
            if (nod.op) {
                throw Error(`${char}左边没有正确的比较值，请检查：${content.substring(0, pos)}`)
            }
            nod.op = RawOP.Comperation;
            let nextStart = pos + 1;
            let nextChar = content.charAt(pos + 1);
            if (char == "<") {
                if (nextChar == "=" || nextChar == ">") {
                    nod.value = char + nextChar;
                    nextStart++;
                }
            } else if (char == ">") {
                if (nextChar == "=") {
                    nod.value = char + nextChar;
                    nextStart++;
                }
            }
            let raw = content.substring(nod.start, pos);
            let node = {
                start: nextStart,
                nodes: [],
                parent: nod
            } as Node;
            nod.nodes.push({
                op: 1,
                start: nod.start,
                end: pos,
                parent: nod,
                raw,
                value: raw,
            } as Node, node)
            nod = node;
            pos = nextStart - 1;
        } else if (char == ")") {
            nod.end = pos;
            let raw = content.substring(nod.start, pos);
            nod.raw = raw;
            if (!nod.op) {
                nod.op = RawOP.Value;
                nod.value = raw;
            }
            do {
                nod = nod.parent;
                if (nod) {
                    nod.end = pos;
                    if (isBrackedsType(nod.op)) {
                        nod.close = true;
                        break;
                    }
                } else {
                    break;
                }
            } while (true)

        }
        pos++;
    }
    checkNode(root);
    return getOutData(root);
}



function isBrackedsType(op: RawOP) {
    return (op & RawOP.BracketsMask) == RawOP.BracketsMask
}

/**
 * 检查数据
 * @param root 
 */
function checkNode(node: Node) {
    let { op, nodes } = node;
    if (op == RawOP.Comperation) {
        let ns = nodes.filter(n => n.value || n.nodes.length)
        //检查子节点
        if (ns.length != 2) {
            throw Error(`${node.raw}为比较操作，但是有空数据`)
        }
        //检查数据是否在`TiaoJian`表中
        if (tiaojian) {
            let findCfg: TiaoJianCfg;
            let value: number;
            for (let i = 0; i < 2; i++) {
                const nd = ns[i];
                let nop = RawOP.Value;
                if (nop == RawOP.Value) {
                    if (!findCfg) {
                        findCfg = tiaojian[nd.value];
                        if (findCfg) {
                            nd.op = RawOP.TiaoJianKey;
                        }
                    } else {
                        value = +nd.value;
                    }
                } else if (isBrackedsType(nop)) {
                    checkNode(nd);
                } else {
                    throw Error(`配置的条件[${node.raw}]的[${node.value}]两边填写的数据有误`);
                }
            }
            if (findCfg) {
                if (value != null) {
                    let { min, max } = findCfg;
                    if (min != null && value < min) {
                        throw Error(`配置的条件[${node.raw}]，低于条件的最小值[${min}]`)
                    }
                    if (max != null && value > max) {
                        throw Error(`配置的条件[${node.raw}]，高于条件的最大值[${max}]`)
                    }
                }
            } else {
                throw Error(`无法在指定条件表[${_tiaojianPath}]找到对应条件，请检查[${node.raw}]`)
            }
        }
    } else if (op == RawOP.Value) {
        //不做处理
    } else {
        if (isBrackedsType(op)) {
            if (op == RawOP.Function) {
                if (_supportedFunctions && _supportedFunctions.indexOf(node.value) == -1) {
                    throw Error(`未支持的函数[${node.value}]`)
                }
            }
            if (!node.close) {
                throw Error(`括号未闭合，请检查[${node.raw}]`)
            }
        }
        nodes.forEach(node => checkNode(node));
    }
}

const enum Operator {
    Value = 0,//值
    Function = 1,//函数
    Comparation = 2,//比较
    TiaoJianKey = 3,//条件key
}

const OpTransfer = {
    [RawOP.Value]: Operator.Value,
    [RawOP.Function]: Operator.Function,
    [RawOP.Comperation]: Operator.Comparation,
    [RawOP.TiaoJianKey]: Operator.TiaoJianKey
}

function getOutData(node: Node) {
    let { op, value, nodes } = node;
    let nods = nodes && nodes.length && nodes.map(getOutData)
    let data = {
        op: OpTransfer[op],
        value
    } as Node;
    nods && (data.nodes = nods);
    return data;
}