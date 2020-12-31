import { getTiledCfg } from "./getTiledCfg";
import { Tile } from "./TileSetParser";

export type TiledMapLayerInfo = { [pos: number]: Tile };

export interface TiledMap {
    width: number;
    height: number;

    tileWidth: number;
    tileHeight: number;
    layers: TiledMapLayerInfo[];
}

export async function loadTiledMap(cfgPath: string, tileDict: { [id: number]: Tile }) {
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

    const tileLayers = [] as TiledMapLayerInfo[];

    for (const layer of layers) {
        //检查数据 layer.data
        const { data } = layer;
        let dict = [] as { [id: number]: Tile };
        let textures = [] as egret.Texture[];
        for (let i = 0; i < data.length; i++) {
            let id = data[i];
            if (id !== 0) {
                let tile = tileDict[id];
                if (tile) {
                    dict[i] = tile;
                    textures.pushOnce(tile.texture);
                }
            }
        }
        tileLayers.push(dict)
    }


    return {
        width,
        height,
        tileWidth: mtw,
        tileHeight: mth,
        layers: tileLayers
    } as TiledMap;

}

