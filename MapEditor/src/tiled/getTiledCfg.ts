
const fs: typeof import("fs") = nodeRequire("fs");
export function getTiledCfg(cfgPath: string) {
    //加载配置
    if (!fs.existsSync(cfgPath)) {
        throw Error(`TiledMap的配置路径[${cfgPath}]不存在`);
    }
    let cfgContent = fs.readFileSync(cfgPath, "utf8");
    let cfg: TieldMap.Map;
    try {
        cfg = JSON.parse(cfgContent);
    } catch {
        throw Error(`TiledMap的配置[${cfgPath}]，格式不是JSON`);
    }
    return cfg;
}