import { loadRes } from "../res/ResPromise";
import { getTiledCfg } from "./getTiledCfg";

const path: typeof import("path") = nodeRequire("path");
const fs: typeof import("fs") = nodeRequire("fs");

const enum Const {
    RhombusKey = "a",
    Size = 2048,
}

const enum TileTexType {
    Rectangle = 0,
    Rhombus = 1,
    /**
     * 直接在Tiled中画出的4点的多边形
     */
    Polygon = 2,
}

interface BaseTileInfo extends Array<any> {
    /**
     * uvs
     */
    0: number[];
    /**
     * 顶点数组
     */
    1: number[][];
    /**
     * 纹理id
     */
    2?: number;
}

interface TileInfo {
    /**
     * Tiled中的标识
     */
    id: number;
    tid?: number;
    uvs: number[];
    type: TileTexType;
    /**
     * 只有type为`多边形`时，此值有效
     */
    polygon?: jy.Point[];

    dict: number[][]
}



type TileData = { tile: TileInfo, data: ImageData, s: number }

export async function createTileSets(cfgPath: string, basePath: string) {


    const cfg = getTiledCfg(cfgPath);

    const { tilesets, tileheight: mth } = cfg;
    if (!tilesets || !tilesets.length) {
        throw Error(`TiledMap的配置[${cfgPath}]有误，没有任何有纹理集`);
    }
    let baseDir = path.dirname(cfgPath);
    const tileList = [] as TileData[];
    for (let i = 0; i < tilesets.length; i++) {
        await prepareTileSet(tilesets[i], tileList, baseDir)
    }
    //合并纹理
    const canvases = mergeTiles(tileList.concat());
    //创建纹理和tile数据
    const dict = await createFiles(basePath, canvases, tileList);

    alert("成功创建纹理数据");
    return dict;
    async function prepareTileSet(cfg: TiledMap.Tileset, tileList: TileData[], baseDir: string) {
        let { image, imagewidth, imageheight, columns, firstgid, tilewidth, tileheight, tilecount, margin, spacing, tiles, tileoffset } = cfg;
        if (tiles) {
            if (tiles.length != tilecount) {
                let newTiles = [];
                //根据id重整数据
                for (let i = 0; i < tiles.length; i++) {
                    const tile = tiles[i];
                    newTiles[tile.id] = tile;
                }
                tiles = newTiles;
            }
        } else {
            tiles = [];
        }
        let setA = getProperty(cfg.properties, Const.RhombusKey);
        let imgPath = path.join(baseDir, image);
        let item = await loadRes({ uri: imgPath, url: imgPath });
        let texture = item.data;
        let img = texture.$bitmapData.$source as HTMLImageElement;
        let canvas = document.createElement("canvas");
        canvas.width = imagewidth;
        canvas.height = imageheight;
        let cnt = canvas.getContext("2d");
        cnt.drawImage(img, 0, 0);
        let t = 0;
        let y = margin;
        let ox = 0, oy = 0;
        let oy1 = 0;
        if (tileoffset) {
            ox = tileoffset.x;
            oy = -(tileheight - mth - tileoffset.y);
            oy1 = -(tilewidth - mth - tileoffset.y);
        }
        while (t < tilecount) {
            let x = margin;
            for (let col = 0; col < columns; col++) {
                tileList.push(createTileData(cfg, firstgid, tiles[t], x, y, ox, oy, oy1, cnt, setA))
                t++;
                firstgid++;
                x += tilewidth + spacing;
            }
            y += tileheight + spacing;
        }
    }
    function mergeTiles(tileList: TileData[]) {
        let canvases = [] as HTMLCanvasElement[];
        //按照对角线长度，由大到小排列
        tileList.doSort("s", true);
        let cid = 0;
        //尝试装箱
        //创建2048*2048箱体
        while (tileList.length) {
            let binPacker = new jy.ShortSideBinPacker(Const.Size, Const.Size, true);
            let canvas = document.createElement("canvas");
            let cnt = canvas.getContext("2d");
            canvas.width = canvas.height = Const.Size;
            let j = 0;
            for (const tile of tileList) {
                let data = tile.data;
                let bin = binPacker.insert(data.width, data.height);
                if (bin) {
                    resetTile(tile, bin, cid, cnt);
                } else {
                    tileList[j++] = tile;
                }
            }
            tileList.length = j;
            canvases[cid++] = canvas;
        }

        return canvases;
    }

    function resetTile({ tile, data }: TileData, bin: jy.Bin, cid: number, cnt: CanvasRenderingContext2D) {
        tile.tid = cid;
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
            let left = ox / Const.Size;
            let top = oy / Const.Size;
            let right = (ox + dh) / Const.Size;
            let bottom = (oy + dw) / Const.Size;

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

            } else if (type == TileTexType.Rhombus) {
                //       左(1)
                //
                //    下(2)  上(0)
                //
                //       右(3)
                let mv = (oy + dw * .5) / Const.Size;
                let mh = (ox + dh * .5) / Const.Size;

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
            } if (type == TileTexType.Polygon) {
                let polygon = tile.polygon.map(pt => ({
                    x: (dh - pt.y + ox) / Const.Size,
                    y: (pt.x + oy) / Const.Size
                }));
                let [p1, p2, p3, p0] = polygon;
                uvs[0] = p0.x;
                uvs[1] = p0.y;

                uvs[2] = p1.x;
                uvs[3] = p1.y;

                uvs[4] = p2.x;
                uvs[5] = p2.y;

                uvs[6] = p3.x;
                uvs[7] = p3.y;

            }
        } else {
            cnt.putImageData(data, ox, oy);
            let left = ox / Const.Size;
            let top = oy / Const.Size;
            let right = (ox + dw) / Const.Size;
            let bottom = (oy + dh) / Const.Size;
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

            } else if (type == TileTexType.Rhombus) {
                //       上(0)
                // 左(1)        右(3)
                //       下(2)
                let mv = (oy + dh * .5) / Const.Size;
                let mh = (ox + dw * .5) / Const.Size;

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
            } else if (type == TileTexType.Polygon) {
                let polygon = tile.polygon.map(pt => ({
                    x: (pt.x + ox) / Const.Size,
                    y: (pt.y + oy) / Const.Size
                }));
                let [p0, p1, p2, p3] = polygon;
                uvs[0] = p0.x;
                uvs[1] = p0.y;

                uvs[2] = p1.x;
                uvs[3] = p1.y;

                uvs[4] = p2.x;
                uvs[5] = p2.y;

                uvs[6] = p3.x;
                uvs[7] = p3.y;
            }
        }
    }
}


function getProperty(properties: TiledMap.Property[], key: string) {
    if (properties) {
        for (const property of properties) {
            if (property.name === key) {
                return property.value;
            }
        }
    }
}


async function createFiles(basePath: string, canvases: HTMLCanvasElement[], tileList: TileData[]) {
    //检查tile数据，看看uvs中的数据是否数据相同，尝试共用
    //先输出canvas
    const texDict = {} as { [tid: number]: egret.Texture };
    const baseTiledDir = path.join(basePath, TiledConst.DefaultDir);
    for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        await saveCanvas(canvas, path.join(baseTiledDir, i + ".png"));
        const bmd = new egret.BitmapData(canvas);
        const tex = new egret.Texture;
        tex.bitmapData = bmd;
        texDict[i] = tex;
    }
    //简化tile数据
    let tilesJSon = {} as { [id: number]: BaseTileInfo };
    const datas = {} as TileDict;
    for (const { tile: { uvs, dict, tid, id } } of tileList) {
        let texture = texDict[tid];
        let list = [uvs, dict] as BaseTileInfo;
        if (tid != 0) {
            list[2] = tid;
        }
        tilesJSon[id] = list;
        for (let v in dict) {
            let verts = dict[v];
            datas[getTileId(+v, id)] = {
                uvs,
                verts,
                texture
            }
        }
    }
    fs.writeFileSync(path.join(baseTiledDir, TiledConst.TileSetFile), JSON.stringify(tilesJSon));

    return datas;
    function saveCanvas(canvas: HTMLCanvasElement, file: string) {
        return new Promise<void>((resolve) => {
            canvas.toBlob(async blob => {
                let fr = new FileReader();
                fr.onload = function () {
                    let buffer = fr.result as ArrayBuffer;
                    fs.writeFileSync(file, Buffer.from(buffer));
                    resolve();
                }
                fr.readAsArrayBuffer(blob);

            })
        })
    }
}

function createTileData(cfg: TiledMap.Tileset, id: number, tileInfo: TiledMap.Tile, x: number, y: number, ox: number, oy: number, oy1: number, cnt: CanvasRenderingContext2D, setA?: boolean) {
    const { tilewidth, tileheight } = cfg;

    let pInfo = tileInfo?.objectgroup?.objects?.[0];
    let polygon = pInfo?.polygon;
    //得到原始，不带偏移量的顶点坐标集
    let polys: jy.Point[];
    let type: TileTexType;
    let imgX = x, imgY = y, imgW = tilewidth, imgH = tileheight;
    if (polygon && polygon.length == 4) {//多边形
        let { x: px, y: py } = pInfo
        let left = tilewidth, right = 0, top = tileheight, bottom = 0;
        //去除超出边界的点
        polys = polygon.map(pt => {
            let x = Math.clamp(pt.x + px, 0, tilewidth);
            let y = Math.clamp(pt.y + py, 0, tileheight);
            pt.x = x;
            pt.y = y;
            if (x < left) {
                left = x;
            }
            if (x > right) {
                right = x;
            }
            if (y < top) {
                top = y;
            }
            if (y > bottom) {
                bottom = y;
            }
            return pt;
        })
        //重新计算polygon尺寸
        polygon = polygon.map(pt => ({
            x: pt.x - left,
            y: pt.y - top
        }))
        //polygon的图片数据进行缩减
        imgX = x + left;
        imgY = y + top;
        imgW = right - left;
        imgH = bottom - top;
        type = TileTexType.Polygon;
    } else {
        //先判断纹理集，再判断单纹理
        let tileA = setA || getProperty(tileInfo?.properties, Const.RhombusKey);
        const tileHW = tilewidth * .5;
        const tileHH = tileheight * .5;
        if (tileA) {
            //       上(0)
            // 左(1)        右(3)
            //       下(2)
            polys = [
                { x: tileHW, y: 0 },
                { x: 0, y: tileHH },
                { x: tileHW, y: tileheight },
                { x: tilewidth, y: tileHH }
            ]
            type = TileTexType.Rhombus;
        } else {
            // 左上(0)      右上(3)
            // 
            // 左下(1)      右下(2)
            polys = [
                { x: 0, y: 0 },
                { x: 0, y: tileheight },
                { x: tilewidth, y: tileheight },
                { x: tilewidth, y: 0 }
            ]
            type = TileTexType.Rectangle;
        }
    }
    //根据形势，形成字典
    const dict = [] as number[][];
    const [p0, p1, p2, p3] = polys;


    const [p11, p12, p13, p10] = polys.map(pt => ({
        x: tileheight - pt.y,
        y: pt.x
    }))

    //0
    dict[getId(0)] = [
        ox + p0.x,
        oy + p0.y,
        ox + p1.x,
        oy + p1.y,
        ox + p2.x,
        oy + p2.y,
        ox + p3.x,
        oy + p3.y,
    ]

    //1
    dict[getId(1)] = [
        ox + p11.x,
        oy1 + p11.y,
        ox + p10.x,
        oy1 + p10.y,
        ox + p13.x,
        oy1 + p13.y,
        ox + p12.x,
        oy1 + p12.y,
    ]

    //2
    dict[getId(2)] = [
        ox + p1.x,
        oy + p1.y,
        ox + p0.x,
        oy + p0.y,
        ox + p3.x,
        oy + p3.y,
        ox + p2.x,
        oy + p2.y,
    ]

    //3
    dict[getId(3)] = [
        ox + p12.x,
        oy1 + p12.y,
        ox + p13.x,
        oy1 + p13.y,
        ox + p10.x,
        oy1 + p10.y,
        ox + p11.x,
        oy1 + p11.y,
    ]

    //4
    dict[getId(4)] = [
        ox + p3.x,
        oy + p3.y,
        ox + p2.x,
        oy + p2.y,
        ox + p1.x,
        oy + p1.y,
        ox + p0.x,
        oy + p0.y,
    ]

    //5
    dict[getId(5)] = [
        ox + p10.x,
        oy1 + p10.y,
        ox + p11.x,
        oy1 + p11.y,
        ox + p12.x,
        oy1 + p12.y,
        ox + p13.x,
        oy1 + p13.y,
    ]

    //6
    dict[getId(6)] = [
        ox + p2.x,
        oy + p2.y,
        ox + p3.x,
        oy + p3.y,
        ox + p0.x,
        oy + p0.y,
        ox + p1.x,
        oy + p1.y,
    ]

    //7
    dict[getId(7)] = [
        ox + p13.x,
        oy1 + p13.y,
        ox + p12.x,
        oy1 + p12.y,
        ox + p11.x,
        oy1 + p11.y,
        ox + p10.x,
        oy1 + p10.y,
    ]

    const data = cnt.getImageData(imgX, imgY, imgW, imgH);
    let tile = {
        uvs: [] as number[],
        dict,
        type,
        id,
        polygon
    } as TileInfo;
    return {
        tile,
        data,
        s: Math.sqrt(imgW * imgW + imgH * imgH)
    };

    function getId(value: number) {
        return value
    }
}

export function getTileId(value: number, id: number) {
    return ((value << 29) | id) >>> 0
}

export async function loadTileset(basePath: string) {
    //尝试加载tile数据
    //检查文件夹
    let tiledBasePath = path.join(basePath, TiledConst.DefaultDir)
    if (!fs.existsSync(tiledBasePath) || !fs.statSync(tiledBasePath).isDirectory()) {
        throw Error(`tiled路径[${tiledBasePath}]不存在`);
    }
    //检查数据文件是否能加载
    let dataPath = path.join(tiledBasePath, TiledConst.TileSetFile);
    if (!fs.existsSync(dataPath)) {
        throw Error(`tiled数据文件[${dataPath}]不存在`);
    }
    let fileContent = fs.readFileSync(dataPath, "utf8");
    let rawData: { [id: number]: BaseTileInfo };
    try {
        rawData = JSON.parse(fileContent);
    } catch {
        throw Error(`tiled数据文件[${dataPath}]数据有误，无法通过JSON解析`);
    }

    let list = fs.readdirSync(tiledBasePath);
    //找到纹理文件
    let texDict = {} as { [id: number]: egret.Texture };
    for (const file of list) {
        if (/(\d+)\.png/.test(file)) {
            let id = RegExp.$1;
            let fullpath = path.join(tiledBasePath, file);
            let item = await loadRes({ url: fullpath, uri: fullpath });
            let tex = item.data as egret.Texture;
            if (tex) {
                texDict[id] = tex;
            } else {
                throw Error(`纹理[${fullpath}]加载失败，请检查`);
            }
        }
    }

    //加载数据文件，完成tile字典
    let data = {} as TileDict;
    for (let id in rawData) {
        let [uvs, dict, tid] = rawData[id];
        tid = tid | 0;
        let texture = texDict[tid];
        if (!texture) {
            throw Error(`Tile[id:${id}]数据和纹理[tid:${tid}]对应不上`);
        }
        for (let v in dict) {
            let verts = dict[v];
            data[getTileId(+v, +id)] = {
                uvs,
                verts,
                texture
            }
        }
    }
    return data;
}
