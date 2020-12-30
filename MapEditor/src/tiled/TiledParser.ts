import { loadRes } from "../res/ResPromise";
import { getTiledCfg } from "./getTiledCfg";
import { Tile } from "./TileSetParser";


export interface TiledMap {
    width: number;
    height: number;

    tileWidth: number;
    tileHeight: number;
    layers: TiledMapLayerInfo[];
}

export interface TiledMapLayerInfo {
    cfg: TieldMap.Layer;
    tileDict: { [pos: number]: Tile };
    textures: egret.Texture[];
}


const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");


export async function loadTiledMap(cfgPath: string, tileDict: { [id: number]: Tile }) {
    //加载配置
    const cfg = getTiledCfg(cfgPath);
    let baseDir = path.dirname(cfgPath);
    const { layers, tilesets, width, height, tilewidth: mtw, tileheight: mth } = cfg;
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
        tileLayers.push({
            cfg: layer,
            tileDict: dict,
            textures
        })
    }


    return {
        width,
        height,
        tileWidth: mtw,
        tileHeight: mth,
        layers: tileLayers
    } as TiledMap;

}

