//此处完成输入数据的操作
const path = nodeRequire("path") as typeof import("path");
const fs = nodeRequire("fs") as typeof import("fs");



/**
 * 加载配置，返回需要的数据
 * @param cfg 
 */
export function getInput(cfg: GlobalCfg) {
    return varifyCfg(cfg) && load(cfg)
}

/**
 * 验证配置
 * @param cfg 
 */
function varifyCfg(cfg: GlobalCfg) {
    let { source, keyDict } = cfg;
    source = source && source.trim();
    if (!source) {
        return alert(`没有配置技能的数据源`)
    }
    if (!fs.existsSync(source)) {
        return alert(`无法找到数据源[${source}]指定的文件`)
    }
    cfg.source = source;

    if (!keyDict) {
        keyDict = {};
        cfg.keyDict = keyDict;
    }
    keyDict.id ||= "id";
    keyDict.type ||= "type";
    keyDict.range ||= "range";
    keyDict.param1 ||= "param1";
    keyDict.param2 ||= "param2";

    let typeDict = keyDict.typeDict;
    if (!typeDict) {
        keyDict.typeDict = typeDict = {} as { [type: string]: SkillAreaType; }
    }
    typeDict[0] ||= 0;
    typeDict[1] ||= 1;
    typeDict[2] ||= 2;
    return true;
}

function load(cfg: GlobalCfg) {
    let source = cfg.source;
    let file = fs.readFileSync(source, "utf8");
    let rawData: any[];
    try {
        rawData = JSON.parse(file);
    } catch {
        return alert(`数据源[${source}]有误，不是正确的JSON文件`)
    }
    if (!Array.isArray(rawData)) {
        return alert(`数据源[${source}]有误，不是数组数据，请检查数据源`)
    }
    return transformData(rawData, cfg);
}

/**
 * 原始数据，转为工具使用的数据
 * @param rawData 
 */
function transformData(rawData: any[], cfg: GlobalCfg) {
    let keyData = cfg.keyDict;
    let typeDict = keyData.typeDict;
    let cfgData = [] as SkillCfg[];
    for (let i = 0; i < rawData.length; i++) {
        let data = rawData[i];
        let rawType = data[keyData.type];
        let type = typeDict[rawType];
        if (type == undefined) {
            if (confirm(`数据源中，有未实现的范围类型[${keyData.type}:${rawType}]\n，点击"确定"忽略并继续`)) {
                continue;
            } else {
                return
            }
        }
        let cfg = {} as SkillCfg;
        cfg.type = type;
        cfg.id = data[keyData.id];
        cfg.range = data[keyData.range];
        cfg.param1 = data[keyData.param1];
        cfg.param2 = data[keyData.param2];
        cfgData.push(cfg);
    }
    return cfgData;
}