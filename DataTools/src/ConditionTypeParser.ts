const enum Type {
    /**
     * 具体值
     */
    Value = 1,
    /**
     * 括号
     */
    Brackets = 0b1000,
    /**
     * 函数
     */
    Function = 0b1001,
    /**
     * 比较  
     * = > < <> >= <=
     */
    Comperation = 2,
}

/**
 * 比较符
 */
const enum Comperation {
    /**
     * =
     */
    Equal = 0,
    /**
     * <
     */
    LessThan = 1,
    /**
     * >
     */
    GreaterThan = 2,
    /**
     * <>
     */
    NotEqual = 3,
    /**
     * <=
     */
    LessThanOrEqual = 4,
    /**
     * >=
     */
    GreaterThanOrEqual = 5,
}


interface Node {
    parent: Node;
    type: Type;
    stacks: Node[];
    value: number | string;
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
}


const Comparations =
    ["=", "<", ">"]

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
        stacks: []
    } as Node;
    let root = nod;
    let start = pos;
    while (pos < len) {
        let char = content.charAt(pos);
        if (char == "(") {
            let raw = content.substring(nod.start, pos);
            let func = raw.trim();
            let node = {
                start: pos + 1,
                stacks: [],
                parent: nod,
            } as Node;
            nod.stacks.push(node);
            if (func) {
                nod.type = Type.Function;
                nod.value = func;
            } else {
                nod.type = Type.Brackets;
            }
            nod = node;
        } else if (char == ",") {
            let raw = content.substring(nod.start, pos);
            nod.end = pos;
            nod.raw = raw;
            if (!nod.type) {
                nod.type = Type.Value;
            }
            let value = raw.trim();
            do {
                nod = nod.parent;
            } while ((nod.type & 0b1000) != 0b1000)
            let node = {
                start: pos + 1,
                stacks: [],
                parent: nod,
                raw,
                value,
            } as Node;
            nod.stacks.push(node);
            nod = node;
        } else if (Comparations.indexOf(char) > -1) {
            if (nod.type) {
                throw Error(`${char}左边没有正确的比较值，请检查：${content.substring(0, pos)}`)
            }
            nod.type = Type.Comperation;
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
                stacks: [],
                parent: nod
            } as Node;
            nod.stacks.push({
                type: 1,
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
            nod.raw = content.substring(nod.start, pos);
            if (!nod.type) {
                nod.type = Type.Value;
            }
            do {
                nod = nod.parent;
                nod.end = pos;
            } while ((nod.type & 0b1000) != 0b1000)
        }
        pos++;
    }
    return root;
}