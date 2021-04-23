//此处完成输入数据的操作
const path = nodeRequire("path") as typeof import("path");
const fs = nodeRequire("fs") as typeof import("fs");

//输出数据
export function getOutput(cfg: GlobalCfg) {
    return verifyCfg(cfg) && load(cfg);
}

function verifyCfg(cfg: GlobalCfg) {
    let dist = cfg.dist;
    dist = dist && dist.trim();

    if (!dist) {
        return alert(`没有配置技能的输出路径`)
    }

    let distDir = path.dirname(dist);
    if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
        return alert(`无法找到指定的输出文件夹[${distDir}]`)
    }
    cfg.dist = dist;
    return true
}

function load(cfg: GlobalCfg) {
    let dist = cfg.dist;
    let rawData: SkillCfg[];
    if (fs.existsSync(dist)) {
        let file = fs.readFileSync(dist, "utf8");
        try {
            rawData = JSON.parse(file);
        } catch {
            alert(`数据源[${dist}]有误，不是正确的JSON文件，现在会使用一份空数据`)
        }
    }
    if (!rawData) {
        rawData = [];
    }
    return rawData;
}