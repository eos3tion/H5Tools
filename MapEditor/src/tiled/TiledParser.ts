import { loadRes } from "../res/ResPromise";
const enum Const {
    RhombusKey = "a",
}

const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");

export async function loadTiledMap(cfgPath: string, mergeTileset?: boolean) {
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
    if (!tilesets || !tilesets.length) {
        throw Error(`TiledMap的配置[${cfgPath}]有误，没有任何有纹理集`);
    }

    const tileDict = {} as { [id: number]: Tile };
    const tilesetList = [] as TileSet[];
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
        let tileset = { used: 0 } as TileSet;
        tilesetList[i] = tileset;
        let tileList = [] as Tile[];
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
                let tile = tileDict[firstgid] = {
                    uvs,
                    vertices: verDict[type],
                    type,
                    texture,
                    tileset,
                    id: firstgid,
                    ox: x,
                    oy: y
                }
                t++;
                firstgid++;
                x += tilewidth + spacing;
                tileList.push(tile);
            }
            y += tileheight + spacing;
        }
        tileset.hasRect = hasRect;
        tileset.hasRhombus = hasRhombus;
        tileset.texture = texture;
        tileset.cfg = cfg;
        tileset.verDict = verDict;
        tileset.tiles = tileList;
    }

    const tileLayers = [] as TiledMapLayerInfo[];

    //处理layer数据
    for (const layer of layers) {
        //检查数据 layer.data
        const { data } = layer;
        for (let i = 0; i < data.length; i++) {
            let id = data[i];
            if (id !== 0) {
                let tile = tileDict[id];
                if (tile) {
                    tile.tileset.used++;
                }
            }
        }
    }

    //检查使用的纹理
    if (mergeTileset) {
        let tilesets = [];
        for (const tileset of tilesetList) {
            if (tileset.used > 0) {
                //尝试合并纹理
                tilesets.push(tileset);
            }
        }
        mergeTileSets(tilesets);
    }

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

function getProperty(properties: TieldMap.Property[], key: string) {
    if (properties) {
        for (const property of properties) {
            if (property.name === key) {
                return property.value;
            }
        }
    }
}


function mergeTileSets(tilesets: TileSet[]) {
    type TileData = { tile: Tile, data: ImageData, s: number };
    const Size = 2048;

    const tileList = [] as TileData[];

    for (let i = 0; i < tilesets.length; i++) {
        const tileset = tilesets[i];
        prepare(tileset);
    }

    //按照对角线长度，由大到小排列
    tileList.doSort("s", true);

    //尝试装箱
    //创建2048*2048箱体
    while (tileList.length) {
        let binPacker = new jy.ShortSideBinPacker(Size, Size, true);
        let canvas = document.createElement("canvas");
        let cnt = canvas.getContext("2d");
        canvas.width = canvas.height = Size;
        let bmd = new egret.BitmapData(canvas);
        bmd.$deleteSource = false;
        let tex = new egret.Texture();
        tex.bitmapData = bmd;
        let j = 0;
        for (const tile of tileList) {
            let data = tile.data;
            let bin = binPacker.insert(data.width, data.height);
            if (bin) {
                resetTile(tile, bin, tex, cnt);
            } else {
                tileList[j++] = tile;
            }
        }
        tileList.length = j;
    }

    function resetTile({ tile, data }: TileData, bin: jy.Bin, texture: egret.Texture, cnt: CanvasRenderingContext2D) {
        tile.texture = texture;
        let uvs = tile.uvs;
        let type = tile.type;
        const { x: ox, y: oy, rot } = bin;
        let dw = data.width;
        let dh = data.height;
        //重设UV值
        if (rot) {
            //旋转数据
            let ndata = cnt.createImageData(dh, dw);
            // 0--→  转为   2 1 0
            // 1--→         | | |
            // 2--→         ↓ ↓ ↓
            let dh_1 = dh - 1;
            let dat = data.data;
            let ndat = ndata.data;
            for (let y = 0; y < dh; y++) {
                for (let x = 0; x < dw; x++) {
                    let st = (x * dh + (dh_1 - y)) << 2;
                    let ost = (y * dw + x) << 2;
                    ndat[st + 0] = dat[ost + 0];//R
                    ndat[st + 1] = dat[ost + 1];//G
                    ndat[st + 2] = dat[ost + 2];//B
                    ndat[st + 3] = dat[ost + 3];//A
                }
            }
            cnt.putImageData(ndata, ox, oy);
            let left = ox / Size;
            let top = oy / Size;
            let right = (ox + dh) / Size;
            let bottom = (oy + dw) / Size;

            if (type == TileTexType.Rectangle) {
                // 左下(1)      左上(0)
                // 
                // 右下(2)      右上(3)
                uvs[0] = right;
                uvs[1] = top;

                uvs[2] = left;
                uvs[3] = top;

                uvs[4] = left;
                uvs[5] = bottom;

                uvs[6] = right;
                uvs[7] = bottom;

            } else {
                //       左(1)
                //
                //    下(2)  上(0)
                //
                //       右(3)
                let mv = (oy + dw * .5) / Size;
                let mh = (ox + dh * .5) / Size;

                //上(0)
                uvs[0] = right;
                uvs[1] = mv;
                //左(1)
                uvs[2] = mh;
                uvs[3] = top;
                //下(2)
                uvs[4] = left;
                uvs[5] = mv;
                //右(3)
                uvs[6] = mh;
                uvs[7] = bottom;
            }
        } else {
            cnt.putImageData(data, ox, oy);
            let left = ox / Size;
            let top = oy / Size;
            let right = (ox + dw) / Size;
            let bottom = (oy + dh) / Size;
            if (type == TileTexType.Rectangle) {
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

            } else {
                //       上(0)
                // 左(1)        右(3)
                //       下(2)
                let mv = (oy + dh * .5) / Size;
                let mh = (ox + dw * .5) / Size;

                //上(0)
                uvs[0] = mh;
                uvs[1] = top;
                //左(1)
                uvs[2] = left;
                uvs[3] = mv;
                //下(2)
                uvs[4] = mh;
                uvs[5] = bottom;
                //右(3)
                uvs[6] = right;
                uvs[7] = mv;
            }
        }
    }

    function prepare(tileset: TileSet) {
        let img = tileset.texture.$bitmapData.$source as HTMLImageElement;
        let { cfg: { tilewidth, tileheight, imagewidth, imageheight }, tiles } = tileset;
        let canvas = document.createElement("canvas");
        canvas.width = imagewidth;
        canvas.height = imageheight;
        let cnt = canvas.getContext("2d");
        cnt.drawImage(img, 0, 0);
        let s = Math.sqrt(tilewidth * tilewidth + tileheight * tileheight);

        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const data = cnt.getImageData(tile.ox, tile.oy, tilewidth, tileheight);
            tileList.push({
                tile,
                data,
                s
            })
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
    /**
     * 使用量
     */
    used: number;
    tiles: Tile[];
}

const enum TileTexType {
    Rectangle = 0,
    Rhombus = 1,
}

interface Tile {
    id: number;
    uvs: number[];
    vertices: number[];
    /**
     * 0 矩形
     * 1 菱形
     */
    type: TileTexType;

    texture: egret.Texture;

    tileset: TileSet;

    /**
     * 在纹理中的x轴偏移量（像素）
     */
    ox: number;
    /**
     * 在纹理中的y轴偏移量（像素）
     */
    oy: number;
}