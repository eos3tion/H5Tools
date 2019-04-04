import { PathSolution, OnSaveOption } from "./PathSolution";
import { Core, createRadio } from "../Core";

import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $path from "path";
const path: typeof $path = nodeRequire("path");

const enum Const {
    radioName = "radMapPath",
}


let txtGridWidth: HTMLInputElement;
let txtGridHeight: HTMLInputElement;
let lblColumns: HTMLLabelElement;
let lblRows: HTMLLabelElement;
let btnEmpty: HTMLInputElement;
let btnFull: HTMLInputElement;

/**
 * 尺寸是否匹配
 */
let sizeNotMatch: boolean;

/**
 * 加载到的地图配置
 */
let cfg: jy.MapInfo;

function createInput(type: string) {
    const inp = document.createElement("input");
    inp.type = type;
    return inp;
}

function makeRow(table: HTMLTableElement, label: string, control: Node) {
    const row = table.insertRow();
    let cell = row.insertCell();
    cell.innerText = label;
    cell = row.insertCell();
    cell.appendChild(control);
}


function calGrids() {
    let currentMap = Core.selectMap;
    if (!currentMap) {
        return;
    }
    let { width, height } = currentMap;
    let gridWidth = +txtGridWidth.value;
    if (!gridWidth || gridWidth < 0) {
        txtGridWidth.focus;
        return alert("请重新设置格子宽度！");
    }
    let gridHeight = +txtGridHeight.value;
    if (!gridHeight || gridHeight < 0) {
        txtGridHeight.focus;
        return alert("请重新设置格子高度！");
    }
    let columns = width / gridWidth | 0;//向下取整，减少一个格子，避免走出边界
    let rows = height / gridHeight | 0;
    currentMap.columns = columns;
    currentMap.rows = rows;
    lblColumns.innerText = columns + "";
    lblRows.innerText = rows + "";
    currentMap.gridHeight = gridHeight;
    currentMap.gridWidth = gridWidth;
    let cfg = Core.mapCfg;
    if (cfg) {
        if (cfg.columns != currentMap.columns || cfg.rows != currentMap.rows) {
            sizeNotMatch = true;
            alert(`检查到地图配置中地图格子尺寸[${cfg.columns}×${cfg.rows}]和计算的尺寸[${currentMap.columns}×${currentMap.rows}]不匹配，请检查。\n如果继续操作，将会弃用原地图路径点数据`);
        }
        if (!sizeNotMatch) {
            let b64 = cfg.pathdataB64;
            if (b64) {
                currentMap.pathdata = new Uint8Array(egret.Base64Util.decode(b64));
            }
        }
    }
}

function getWalk(this: jy.MapInfo, x: number, y: number): number {
    const { columns, pathdata } = this;
    if (!pathdata) {
        return 0;
    }
    let position = y * columns + x;
    let byteCount = position >> 3;
    let bitCount = position - (byteCount << 3);
    return (pathdata[byteCount] >> 7 - bitCount) & 1;
}

function setWalk(x: number, y: number, flag: any, map: jy.MapInfo) {
    let { columns, pathdata } = map;
    if (!pathdata) {
        map.pathdata = pathdata = new Uint8Array(Math.ceil(columns * map.rows / 8));
    }
    let position = y * columns + x;
    let byteCount = position >> 3;
    let bitCount = position - (byteCount << 3);
    pathdata[byteCount] = setBitState(pathdata[byteCount], (7 - bitCount), flag);
}

function setBitState(value: number, bitIdx: number, flag) {
    if (flag) {
        value = value | 1 << bitIdx;
    } else {
        value = value & ~(1 << bitIdx)
    }
    return value;
}

function fillGrids(val: number) {
    return function () {
        let pathdata = Core.selectMap.pathdata;
        pathdata.fill(val);
        $engine.invalidate();
    }
}

/**
 * 屏幕像素坐标转为地图坐标
 * 如果没有设置out，则会直接改变point
 * @export
 * @param {Point} point
 * @param {Point} [out]
 */
function screen2Map(point: jy.Point, out?: jy.Point) {
    out = out || point;
    const map = Core.selectMap;
    out.x = Math.round(point.x / map.gridWidth);
    out.y = Math.round(point.y / map.gridHeight);
}

/**
 * 地图坐标转换为屏幕像素坐标
 * 如果没有设置out，则会直接改变point
 * @export
 * @param {Point} point
 * @param {Point} [out]  
 */
function map2Screen(point: jy.Point, out?: jy.Point) {
    out = out || point;
    const map = Core.selectMap;
    out.x = point.x * map.gridWidth + map.gridWidth * .5;
    out.y = point.y * map.gridHeight + map.gridHeight * .5;
}
const view = $g("StateEdit");

function showMapGrid() {
    $gm.$showMapGrid = true;
    //监听鼠标事件
    view.addEventListener("mousedown", onBegin);
    view.addEventListener("mousemove", showCoord);
    $engine.invalidate();
}

function onBegin(e: MouseEvent) {
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
    screen2Map(pt);
    //设置可走/不可走
    setWalk(pt.x, pt.y, +$(`input[name=${Const.radioName}]:checked`).val(), Core.selectMap);
    $engine.invalidate();
}

function onEnd() {
    view.removeEventListener("mousemove", onMove);
    view.removeEventListener("mouseup", onEnd);
    view.removeEventListener("mousemove", showCoord);
}

function hideMapGrid() {
    onEnd();
    $gm.$showMapGrid = false;
}

let lblPixelPoint: HTMLLabelElement;
let lblGridPoint: HTMLLabelElement;

function showCoord(e: MouseEvent) {
    const { clientX, clientY } = e;
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
    lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
    screen2Map(pt);
    lblGridPoint.innerText = `格位坐标：${pt.x},${pt.y}`;
}

class DrawMapPathControl {


    @jy.d_memoize
    get view() {
        const div = document.createElement("div");
        btnEmpty = document.createElement("input");
        btnEmpty.type = "button";
        btnEmpty.value = "全部可走";
        btnEmpty.addEventListener("click", fillGrids(0xff));
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
        createRadio("可走", 1, Const.radioName, div, true);
        createRadio("不可走", 0, Const.radioName, div, false);
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


export class GridMapPath implements PathSolution {
    map: jy.MapInfo;
    setMapData(map: jy.MapInfo) {
        this.map = map;
        map.getWalk = getWalk;
        this.initView();
        calGrids();
    }

    initView() {
        let gridWidth = 60;
        let gridHeight = 30;
        let map = this.map;
        if (map) {
            gridWidth = map.gridWidth || 60;
            gridHeight = map.gridHeight || 30;
        }
        txtGridWidth.value = gridWidth + "";
        txtGridHeight.value = gridHeight + "";
    }

    readonly drawMapPathControl = new DrawMapPathControl();

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

        return table;
    }

    getDataB64(pathdata: Uint8Array) {
        let v = pathdata.find(v => v != 0);
        if (v != undefined) {//检查pathdata中的数据,如果全部可走，则返回空
            return egret.Base64Util.encode(pathdata.buffer);
        }
    }

    onSave(opt: OnSaveOption) {
        const { map, log } = opt;
        let bytes = getDataForJava(map);
        let file = path.join(Core.basePath, map.path, ConstString.JavaMapPath);
        fs.writeFileSync(file, bytes);
        log(`存储至${file}`);
    }
}

function getDataForJava(map: jy.MapInfo) {//为了避免服务端数据结构变更，减少
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