import { getTiledCfg } from "./getTiledCfg";

export type TiledMapLayerInfo = Tile[];

export interface TiledMap {
    cols: number;
    rows: number;

    tileWidth: number;
    tileHeight: number;
    layerData: number[][];
}

export async function loadTiledMap(cfgPath: string, tileDict: TileDict) {
    //加载配置
    const cfg = getTiledCfg(cfgPath);
    const { layers, width, height, tilewidth: mtw, tileheight: mth } = cfg;
    //排除掉不可见图层
    if (layers) {
        let j = 0;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (layer.visible) {
                layers[j++] = layer;
            }
        }
        layers.length = j;
    }
    //检查图层数据
    if (!layers || !layers.length) {
        throw Error(`TiledMap的配置[${cfgPath}]有误，没有任何有效图层`);
    }

    const layerData = [] as number[][];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        //检查数据 layer.data
        const { data, name, visible } = layer;
        if (visible) {
            checkTiledData(data, tileDict, name);
            layerData.push(data);
        }
    }

    return {
        cols: width,
        rows: height,
        tileWidth: mtw,
        tileHeight: mth,
        layerData
    } as TiledMap;
}

export function checkTiledData(data: ArrayLike<number>, tileDict: TileDict, idx: string) {
    for (let i = 0; i < data.length; i++) {
        let id = data[i];
        if (id !== 0) {
            let tile = tileDict[id];
            if (!tile) {
                throw Error(`TiledMap的[layer:${idx}]，上有纹理集中没有的Tile[id:${id}]`);
            }
        }
    }
}