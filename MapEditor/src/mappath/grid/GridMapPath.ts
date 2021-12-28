import { PathSolution, OnSaveOption } from "../PathSolution";
import { Core } from "../../Core";
import { PB } from "../../pb/PB";
import getMapDataHelper = jy.getMapDataHelper;
import { getDrawMapPathControl } from "../GridDrawMapPathControl";
import { getAreaGroupControl } from "../AreaGroup";


interface MapInfo extends jy.GridMapInfo {
    gridLevel: number;


    /**
     * 点集
     */
    points: jy.PointGroupPB[];

    map2Screen(x: number, y: number, isCenter?: boolean);
}

let txtGridWidth: HTMLInputElement;
let txtGridHeight: HTMLInputElement;
let txtGridLevel: HTMLInputElement;
let lblColumns: HTMLLabelElement;
let lblRows: HTMLLabelElement;


let pathData: jy.MapDataHelper;


function makeRow(table: HTMLTableElement, label: string, control: Node) {
    const row = table.insertRow();
    let cell = row.insertCell();
    cell.innerText = label;
    cell = row.insertCell();
    cell.appendChild(control);
}


function calGrids() {
    let currentMap = getMap();
    if (!currentMap) {
        return;
    }
    let { width, height } = currentMap;
    let gridWidth = +txtGridWidth.value;
    if (!gridWidth || gridWidth < 0) {
        txtGridWidth.focus();
        return alert("请重新设置格子宽度！");
    }
    let gridHeight = +txtGridHeight.value;
    if (!gridHeight || gridHeight < 0) {
        txtGridHeight.focus();
        return alert("请重新设置格子高度！");
    }
    let _gridLevel = +txtGridLevel.value || 1;
    let bit = 1;
    const checkList = [1, 2, 4, 8];
    for (let i = 0; i < checkList.length; i++) {
        const v = checkList[i];
        if (_gridLevel < (1 << v)) {
            bit = v;
            break;
        }
    }

    let columns = Math.ceil(width / gridWidth);
    let rows = Math.ceil(height / gridHeight);
    currentMap.columns = columns;
    currentMap.rows = rows;
    currentMap.pdatabit = bit;
    lblColumns.innerText = columns + "";
    lblRows.innerText = rows + "";
    currentMap.gridHeight = gridHeight;
    currentMap.gridWidth = gridWidth;
    currentMap.gridLevel = _gridLevel;
    checkMapSize();
}

function checkMapSize() {
    let cfg = Core.mapCfg as MapInfo;
    if (cfg) {
        let currentMap = getMap();
        let { columns, rows, pdatabit: bit } = currentMap;
        /**
         * 尺寸是否匹配
         */
        let sizeNotMatch = false;
        if (cfg.columns != columns || cfg.rows != rows) {
            sizeNotMatch = confirm(`检查到地图配置中地图格子尺寸[${cfg.columns}×${cfg.rows}]和计算的尺寸[${currentMap.columns}×${currentMap.rows}]不匹配，请检查。\n点击确定，将会弃用原地图路径点数据`);
        }
        let oldBit = cfg.pdatabit || 1;

        if (!sizeNotMatch) {
            let b64 = cfg.pathdataB64;
            if (b64) {
                let bytes = new Uint8Array(egret.Base64Util.decode(b64));
                if (oldBit != bit) {//扩展数据
                    let oldData = getMapDataHelper(columns, rows, oldBit, bytes);
                    let newData = getMapDataHelper(columns, rows, bit);
                    let outOfRange = false;
                    let maxV = (1 << bit) - 1;
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < columns; c++) {
                            let oldv = oldData.get(c, r);
                            if (oldv > maxV) {
                                oldv = 0;
                                outOfRange = true;
                            }
                            newData.set(c, r, oldv);
                        }
                    }
                    bytes = newData.data as Uint8Array;
                    if (outOfRange) {
                        alert(`检查到有格位数据会超出现有位数，这些格位数据会重置为不可走，请自行调整`)
                    }
                }
                currentMap.pathdata = bytes;
            }
        } else {
            currentMap.pathdata = undefined;
        }
    }
}

function getWalk(this: MapInfo, x: number, y: number): number {
    return pathData.get(x, y);
}

function setWalk(x: number, y: number, flag: any) {
    pathData.set(x, y, flag);
}


const view = $g("StateEdit");


function getMap() {
    return Core.selectMap as MapInfo;
}


export class GridMapPath implements PathSolution<MapInfo> {

    onLoad(map: MapInfo, cfg: MapInfo) {
        map.gridWidth = cfg.gridWidth;
        map.gridHeight = cfg.gridHeight;
        map.pathdataB64 = cfg.pathdataB64;
        map.pdatabit = cfg.pdatabit || 1;
        map.gridLevel = cfg.gridLevel || 1;
        map.points = cfg.points || [];
    }
    map: MapInfo;
    setMapData(map: MapInfo) {
        this.map = map;
        map.getWalk = getWalk;
        this.initView();
        calGrids();
    }

    onBeforeEdit(map: MapInfo) {

        //创建地图数据代理
        pathData = getMapDataHelper(map.columns, map.rows, map.pdatabit, map.pathdata);
        map.pathdata = pathData.data as Uint8Array;
        jy.bindMapPos(map);
    }

    initView() {
        let gridWidth = 60;
        let gridHeight = 30;
        let map = this.map;
        let gridLevel = 1;
        if (map) {
            gridWidth = map.gridWidth || 60;
            gridHeight = map.gridHeight || 30;
            gridLevel = map.gridLevel || 1;
        }
        txtGridWidth.value = gridWidth + "";
        txtGridHeight.value = gridHeight + "";
        txtGridLevel.value = gridLevel + "";
    }

    readonly drawMapPathControl = getDrawMapPathControl(view, { getMap, setWalk });

    readonly areaGroupControl = getAreaGroupControl(view, { getMap });

    readonly name = "格子路径";

    @jy.d_memoize
    get editMapInfoControl() {
        const doc = document;
        const table = doc.createElement("table");
        let inp = doc.createElement("input");
        inp.type = "number";
        inp.value = "60";
        inp.min = "10";
        inp.max = "100";
        makeRow(table, `格子宽度：`, inp);
        txtGridWidth = inp;
        inp = doc.createElement("input");
        inp.type = "number";
        inp.value = "30";
        inp.min = "10";
        inp.max = "100";
        makeRow(table, `格子高度：`, inp);
        txtGridHeight = inp;

        txtGridWidth.addEventListener("change", calGrids);
        txtGridHeight.addEventListener("change", calGrids);

        lblColumns = doc.createElement("label");
        makeRow(table, `水平方向格子数量：`, lblColumns);

        lblRows = doc.createElement("label");
        makeRow(table, `垂直方向格子数量：`, lblRows);


        inp = doc.createElement("input");
        inp.type = "number";
        inp.value = "1";
        inp.min = "1";
        inp.max = "256";
        txtGridLevel = inp;
        txtGridLevel.addEventListener("change", calGrids);
        makeRow(table, `格子级数：`, inp);

        return table;
    }
    beforeSave(out: MapInfo, current: MapInfo) {
        out.gridHeight = current.gridHeight;
        out.gridWidth = current.gridWidth;
        out.columns = current.columns;
        out.rows = current.rows;
        out.pdatabit = current.pdatabit;
        out.gridLevel = current.gridLevel || 1;
        out.points = current.points;
        let pathdata = current.pathdata;
        if (pathdata) {
            out.pathdataB64 = getDataB64(pathdata);
        }
    }

    afterSave(opt: OnSaveOption) {
        const { map, log } = opt;
        const path: typeof import("path") = nodeRequire("path");
        const fs: typeof import("fs") = nodeRequire("fs");
        let bytes = getDataForJava(map as MapInfo);
        let file = path.join(Core.basePath, map.path, ConstString.JavaMapPath);
        fs.writeFileSync(file, bytes);
        log(`存储至${file}`);
    }

    onEnterMap(map: MapInfo) {
        map.getWalk = getWalk;
    }

    getMapBytes(map: MapInfo) {
        let pb = {} as jy.GridMapInfoPB;
        pb.gridWidth = map.gridWidth;
        pb.gridHeight = map.gridHeight;
        pb.columns = map.columns;
        pb.rows = map.rows;
        pb.pdatabit = map.pdatabit;
        pb.points = map.points;
        let data = map.pathdata;
        if (data) {
            pb.pathdata = new jy.ByteArray(data.buffer);
        }
        data = map.adata;
        if (data) {
            pb.alphadata = new jy.ByteArray(data.buffer)
        }
        return PB.writeTo(pb, jy.MapPBDictKey.GridMapInfoPB);
    }

    onEditShow() {
        calGrids();
    }
}

function getDataB64(pathdata: Uint8Array) {
    return egret.Base64Util.encode(pathdata.buffer);
}

function getDataForJava(map: MapInfo) {//为了避免服务端数据结构变更，减少
    //生成列表文件
    let w = map.columns;
    let h = map.rows;
    let bytes = new Buffer(8 + w * h);
    bytes.writeInt32BE(w, 0);
    bytes.writeInt32BE(h, 4);
    let start = 8
    for (let y = 0; y < h; y++) {
        let st = start + y * w;
        for (let x = 0; x < w; x++) {
            bytes[st + x] = map.getWalk(x, y);
        }
    }
    //存储"path.mm"
    return bytes;
}