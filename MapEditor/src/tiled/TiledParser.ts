import { loadRes } from "../res/ResPromise";
const enum Const {
    RhombusKey = "a",
}

const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");

export async function loadTiledMap(cfgPath: string) {
    //加载配置
    if (!fs.existsSync(cfgPath)) {
        throw Error(`TiledMap的配置路径[${cfgPath}]不存在`);
    }
    let baseDir = path.dirname(cfgPath);

    let cfgContent = fs.readFileSync(cfgPath, "utf8");
    let cfg: TieldMap.Map;
    try {
        cfg = JSON.parse(cfgContent);
    } catch {
        throw Error(`TiledMap的配置[${cfgPath}]，格式不是JSON`);
    }

    const { layers, tilesets, width, height, tilewidth: mtw, tileheight: mth } = cfg;
    //检查图层数据
    if (!layers || !layers.length) {
        throw Error(`TiledMap的配置[${cfgPath}]有误，没有任何有效图层`);
    }
    if (!tilesets || !tilesets.length) {
        throw Error(`TiledMap的配置[${cfgPath}]有误，没有任何有纹理集`);
    }

    const tileDict = {} as { [id: number]: Tile };
    const tilesetDict = [] as TileSet[];
    for (let i = 0; i < tilesets.length; i++) {
        let cfg = tilesets[i];
        let { image, imagewidth, imageheight, columns, firstgid, tilewidth, tileheight, tilecount, margin, spacing, tiles = [], tileoffset } = cfg;
        let setA = getProperty(cfg.properties, Const.RhombusKey);
        let imgPath = path.join(baseDir, image);
        let item = await loadRes({ uri: imgPath, url: imgPath });
        let texture = item.data;
        //构建uvs
        let t = 0;
        let y = margin;
        let tileHW = tilewidth * .5;
        let tileHH = tileheight * .5;
        let ox = 0, oy = 0;
        if (tileoffset) {
            ox = tileoffset.x;
            oy = -(tileheight - mth - tileoffset.y);
        }
        //以左上为原点
        let verDict = {
            // 左上(0)      右上(3)
            // 
            // 左下(1)      右下(2)
            [TileTexType.Rectangle]: [
                ox, oy,
                ox, oy + tileheight,
                ox + tilewidth, oy + tileheight,
                ox + tilewidth, oy
            ],
            //       上(0)
            // 左(1)        右(3)
            //       下(2)
            [TileTexType.Rhombus]: [
                ox + tileHW, oy,
                ox, oy + tileHH,
                ox + tileHW, oy + tileheight,
                ox + tilewidth, oy + tileHH
            ],
        };
        let hasRect = false, hasRhombus = false;
        while (t < tilecount) {
            let x = margin;
            for (let col = 0; col < columns; col++) {
                let tileInfo = tiles[t];
                let tileA = setA || getProperty(tileInfo?.properties, Const.RhombusKey);
                let left = x / imagewidth;
                let top = y / imageheight;
                let right = (x + tilewidth) / imagewidth;
                let bottom = (y + tileheight) / imageheight;
                let hw = (x + tilewidth * .5) / imagewidth;
                let hh = (y + tileheight * .5) / imageheight;
                let uvs = [] as number[];
                let type: TileTexType;
                if (tileA) {//菱形
                    //       上(0)
                    // 左(1)        右(3)
                    //       下(2)
                    uvs[0] = hw;
                    uvs[1] = top;

                    uvs[2] = left;
                    uvs[3] = hh;

                    uvs[4] = hw;
                    uvs[5] = bottom;

                    uvs[6] = right;
                    uvs[7] = hh;

                    hasRhombus = true;
                    type = TileTexType.Rhombus;
                } else {
                    // 左上(0)      右上(3)
                    // 
                    // 左下(1)      右下(2)
                    uvs[0] = left;
                    uvs[1] = top;

                    uvs[2] = left;
                    uvs[3] = bottom;

                    uvs[4] = right;
                    uvs[5] = bottom;

                    uvs[6] = right;
                    uvs[7] = top;

                    hasRect = true;
                    type = TileTexType.Rectangle;
                }
                tileDict[firstgid++] = {
                    uvs,
                    vertices: verDict[type],
                    type,
                    texture
                }
                t++;
                x += tilewidth + spacing;
            }
            y += tileheight + spacing;
        }
        tilesetDict[i] = {
            hasRect,
            hasRhombus,
            texture,
            cfg,
            verDict,
        }
    }

    const tileLayers = [] as TiledMapLayerInfo[];

    //处理layer数据
    for (const layer of layers) {
        //检查数据 layer.data
        const { data, width, height } = layer;
        let dict = [] as { [id: number]: Tile };
        let i = 0;
        let textures = [] as egret.Texture[];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let id = data[i];
                if (id !== 0) {
                    let tile = tileDict[id];
                    if (tile) {
                        dict[i] = tile;
                        textures.pushOnce(tile.texture);
                    }
                }
                i++;
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

function getProperty(properties: TieldMap.Property[], key: string) {
    if (properties) {
        for (const property of properties) {
            if (property.name === key) {
                return property.value;
            }
        }
    }
}

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

interface TileSet {
    cfg: TieldMap.Tileset;
    texture: egret.Texture;

    verDict: { [type: number]: number[] };

    /**
     * 是否有矩形纹理
     */
    hasRect: boolean;
    /**
     * 是否有菱形纹理
     */
    hasRhombus: boolean;
}

const enum TileTexType {
    Rectangle = 0,
    Rhombus = 1,
}

interface Tile {
    uvs: number[];
    vertices: number[];
    /**
     * 0 矩形
     * 1 菱形
     */
    type: TileTexType;

    texture: egret.Texture;
}