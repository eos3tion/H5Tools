import { PathSolution, OnSaveOption } from "../PathSolution";
import { Core, createRadio } from "../../Core";
import { PB } from "../../pb/PB";
import getMapDataHelper = jy.getMapDataHelper;

const enum Const {
    radioName = "radMapPath",
}
interface MapInfo extends jy.StaggeredMapInfo {
    gridLevel: number;
}

let txtGridWidth: HTMLInputElement;
let txtGridHeight: HTMLInputElement;
let txtGridLevel: HTMLInputElement;
let lblColumns: HTMLLabelElement;
let lblRows: HTMLLabelElement;
let btnEmpty: HTMLInputElement;
let btnFull: HTMLInputElement;

let pathData: jy.MapDataHelper;

/**
 * 可走区域的等级
 */
let gridLevel: number;



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

    gridLevel = _gridLevel;
    let hh = gridHeight >> 1;
    let columns = Math.ceil(width / gridWidth);
    let rows = Math.ceil(height / hh);
    currentMap.columns = columns;
    currentMap.rows = rows;
    currentMap.pdatabit = bit;
    lblColumns.innerText = columns + "";
    lblRows.innerText = rows + "";
    currentMap.gridHeight = gridHeight;
    currentMap.gridWidth = gridWidth;
    let cfg = Core.mapCfg as MapInfo;
    if (cfg) {
        /**
         * 尺寸是否匹配
         */
        let sizeNotMatch = false, bitNotMatch = false;
        if (cfg.columns != columns || cfg.rows != rows) {
            sizeNotMatch = confirm(`检查到地图配置中地图格子尺寸[${cfg.columns}×${cfg.rows}]和计算的尺寸[${currentMap.columns}×${currentMap.rows}]不匹配，请检查。\n点击确定，将会弃用原地图路径点数据`);
        }
        let oldBit = cfg.pdatabit || 1;
        if (oldBit != bit) {
            bitNotMatch = confirm(`检查到地图配置中地图格子级数[${oldBit}]和计算的尺寸[${bit}]不匹配，请检查。\n点击确定，将会弃用原地图路径点数据`);
        }
        if (!sizeNotMatch && !bitNotMatch) {
            let b64 = cfg.pathdataB64;
            if (b64) {
                currentMap.pathdata = new Uint8Array(egret.Base64Util.decode(b64));
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

function fillGrids(val: number) {
    return function () {
        let pathdata = getMap().pathdata;
        pathdata.fill(val);
        $engine.invalidate();
    }
}


// /**
//  * 地图坐标转换为屏幕像素坐标
//  * 如果没有设置out，则会直接改变point
//  * @export
//  * @param {Point} point
//  * @param {Point} [out]  
//  */
// function map2Screen(point: jy.Point, out?: jy.Point) {
//     out = out || point;
//     const map = getMap();
//     out.x = point.x * map.gridWidth + map.gridWidth * .5;
//     out.y = point.y * map.gridHeight + map.gridHeight * .5;
// }
const view = $g("StateEdit");

function showMapGrid() {
    $gm.$showMapGrid = true;
    //监听鼠标事件
    view.addEventListener("mousedown", onBegin);
    view.addEventListener("mousemove", showCoord);
    $engine.invalidate();
}

function onBegin(e: MouseEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() !== "canvas") {
        return
    }
    if (e.button == 0) {
        view.addEventListener("mousemove", onMove);
        view.addEventListener("mouseup", onEnd);
        onMove(e);
    }
}

function onMove(e: MouseEvent) {
    const { clientX, clientY } = e;
    //转换成格位坐标
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
    pt = getMap().screen2Map(pt.x, pt.y);
    //设置可走/不可走
    setWalk(pt.x, pt.y, +$(`input[name=${Const.radioName}]:checked`).val());
    $engine.invalidate();
}

function onEnd() {
    view.removeEventListener("mousemove", onMove);
    view.removeEventListener("mouseup", onEnd);
}

function hideMapGrid() {
    onEnd();
    view.removeEventListener("mousemove", showCoord);
    $gm.$showMapGrid = false;
}

let lblPixelPoint: HTMLLabelElement;
let lblGridPoint: HTMLLabelElement;

function showCoord(e: MouseEvent) {
    const { clientX, clientY } = e;
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
    lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
    pt = getMap().screen2Map(pt.x, pt.y);
    lblGridPoint.innerText = `格位坐标：${pt.x},${pt.y}`;
}

const BitMask = {
    1: 0xff,
    2: 0b01010101,
    4: 0b00010001,
    8: 0b1
}

function getCurMapWalkableMask() {
    let mask = BitMask[getMap().pdatabit];
    if (!mask) {
        mask = 0xff;
    }
    return mask;
}

function fillWalkable() {
    fillGrids(getCurMapWalkableMask())
}

class DrawMapPathControl {


    @jy.d_memoize
    get view() {
        const div = document.createElement("div");
        btnEmpty = document.createElement("input");
        btnEmpty.type = "button";
        btnEmpty.value = "全部可走";
        btnEmpty.addEventListener("click", fillWalkable);
        div.appendChild(btnEmpty);
        div.appendChild(document.createTextNode("  "));
        btnFull = document.createElement("input");
        btnFull.type = "button";
        btnFull.value = "全部不可走";
        btnFull.addEventListener("click", fillGrids(0));
        div.appendChild(btnFull);
        div.appendChild(document.createElement("br"));
        lblPixelPoint = document.createElement("label");
        div.appendChild(lblPixelPoint);
        div.appendChild(document.createElement("br"));
        lblGridPoint = document.createElement("label");
        div.appendChild(lblGridPoint);
        div.appendChild(document.createElement("br"));
        createRadio("不可走", 0, Const.radioName, div, false);
        createRadio("可走", 1, Const.radioName, div, true);
        for (let i = 2; i <= gridLevel; i++) {
            createRadio(`可走${i}`, i, Const.radioName, div, true);
        }
        return div;
    };

    onToggle(flag: boolean) {
        if (flag) {
            showMapGrid();
        } else {
            hideMapGrid();
        }
    }
}

function getMap() {
    return Core.selectMap as MapInfo;
}


export class StaggeredMapPath implements PathSolution<MapInfo> {

    onLoad(map: MapInfo, cfg: MapInfo) {
        map.gridWidth = cfg.gridWidth;
        map.gridHeight = cfg.gridHeight;
        map.pathdataB64 = cfg.pathdataB64;
        map.pdatabit = cfg.pdatabit || 1;
        map.gridLevel = cfg.gridLevel || 1;
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

    readonly drawMapPathControl = new DrawMapPathControl();

    readonly name = "等角（交错）路径";

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
        out.gridLevel = gridLevel || 1;
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
    let mask = getCurMapWalkableMask();
    let v = pathdata.find(v => v != mask);
    if (v != undefined) {//检查pathdata中的数据,如果全部可走，则返回空
        return egret.Base64Util.encode(pathdata.buffer);
    }
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