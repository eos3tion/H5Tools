import { PathSolution, OnSaveOption } from "../PathSolution";
import { createRadio, Core } from "../../Core";
import Point = egret.Point;
import { Polygon } from "./geom/Polygon";
import { createDelaunay } from "./geom/Delaunay";
import Triangle = jy.Triangle;


function points2Arrs(pts: Point[]) {
    return pts.map(pt => [pt.x, pt.y]) as [number, number][]
}

function arrs2Points(arrs: [number, number][]) {
    return arrs.map(([x, y]) => new Point(x, y));
}

interface Poly {
    isEnd: boolean;
    points: [number, number][];
}


interface MapInfo extends jy.NavMeshMapInfo {

    polys: Poly[];

    trans: [number, number][][];
}

const enum Const {
    radioName = "radBlockPoint",
}

/**
 * 障碍点的状态
 */
const enum BlockPointState {
    None = 0,
    Add = 1,
    Del = 2
}

let btnBake: HTMLInputElement;
let btnEmpty: HTMLInputElement;
let state: BlockPointState;
const view = $g("StateEdit");

const edgePoly = new Polygon();

function initEdgePoly() {
    const { width, height } = $engine.currentMap;
    edgePoly.setPoints([
        new Point(),
        new Point(width, 0),
        new Point(width, height),
        new Point(0, height)
    ])
}


const polygons = [edgePoly] as Polygon[];

let trangles: Triangle[];

let currentDraw: Polygon;

function setState() {
    state = +(document.querySelector(`input[name=${Const.radioName}]:checked`) as HTMLInputElement).value;
    window.removeEventListener("keyup", onKeyUp);
    if (state == BlockPointState.None) {
        view.removeEventListener("click", onClick);
    } else {
        view.addEventListener("click", onClick);
        if (state == BlockPointState.Add) {
            window.addEventListener("keyup", onKeyUp);
        }
    }
}

function onKeyUp(e: KeyboardEvent) {
    let keyCode = e.keyCode;
    if (keyCode == 8/**删除键 */ || keyCode == 46/**delete键 */) {
        if (currentDraw) {//做删除最后一个点的操作
            let vertexV = currentDraw.points;
            removePoint(currentDraw, vertexV[vertexV.length - 1]);
            redraw();
        }
    }
}

function onClick(e: MouseEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() !== "canvas") {
        return
    }
    const { clientX, clientY } = e;
    //转换成格位坐标
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
    const { x, y } = pt;

    if (state == BlockPointState.Add) {
        if (!currentDraw) {
            currentDraw = new Polygon();
            polygons.push(currentDraw);
        }
        //检查点是否和之前的点相同
        let has = currentDraw.find(x, y);
        if (has) {//如果已经有很近的点了，不允许绘制，即便是转折点，也不给绘制
            let first = currentDraw.points[0];
            if (has == first) {//回到第一个点了，进行封闭
                currentDraw.isEnd = true;
                currentDraw = undefined;
            }
        } else {
            currentDraw.add(pt);
        }

        redraw();
    } else if (state == BlockPointState.Del) {
        //检查当前点击的位置，是否离原有的点很近
        let cur: Point;
        let findPoly: Polygon;
        //检查当前点是否和当前`polygon`中的点相近
        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            cur = polygon.find(x, y);
            if (cur) {
                findPoly = polygon;
                break;
            }
        }
        if (cur) {
            removePoint(findPoly, cur);
        }

    }
}

function removePoint(poly: Polygon, pt: Point) {
    poly.remove(pt);
    //删除点以后，多边形先解除封闭，需要重新进行封闭操作
    poly.isEnd = false;
    if (poly.points.length == 0) {
        polygons.remove(poly);
        if (poly == currentDraw) {
            currentDraw = null;
        }
    }
    redraw();
}


/**
 * 合并网格
 */
function unionAll() {
    let polys = polygons.concat();
    for (let i = 0; i < polys.length; i++) {
        const p0 = polys[i];
        for (let j = 1; j < polys.length; j++) {
            const p1 = polys[j];
            if (p0 != p1 && p0.isCW() && p1.isCW()) {
                let v = p0.union(p1);
                if (v && v.length) {
                    polys.remove(p0);
                    polys.remove(p1);
                    v.appendTo(polys);
                }
                i = 1;
                break;
            }
        }
    }
    return polys;
}


let lblPixelPoint: HTMLLabelElement;
function showCoord(e: MouseEvent) {
    const { clientX, clientY } = e;
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
    lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
}

function redraw() {
    //TODO 重绘地图
    $engine.invalidate();
    $engine.render();
}


/**
 * 创建导航网格
 */
function onBake() {
    bytes = undefined;
    let polygons = unionAll();
    trangles = createDelaunay(polygons);
    redraw();
}

function onClear() {
    polygons.length = 1;//保留边框
    trangles = undefined;
    redraw();
}


function showMapGrid() {
    $gm.$showMapGrid = true;
    //监听鼠标事件
    view.addEventListener("mousemove", showCoord);
    $engine.invalidate();
}

function hideMapGrid() {
    currentDraw = undefined;
    window.removeEventListener("keyup", onKeyUp);
    view.removeEventListener("click", onClick);
    $gm.$showMapGrid = false;
}

class DrawMapPathControl {
    @jy.d_memoize
    get view() {
        const div = document.createElement("div");
        btnEmpty = document.createElement("input");
        btnEmpty.type = "button";
        btnEmpty.value = "清除全部网格";
        btnEmpty.addEventListener("click", onClear);
        div.appendChild(btnEmpty);
        div.appendChild(document.createElement("br"));
        createRadio("无操作", BlockPointState.None, Const.radioName, div, true, setState);
        createRadio("添加障碍点", BlockPointState.Add, Const.radioName, div, false, setState);
        createRadio("移除障碍点", BlockPointState.Del, Const.radioName, div, false, setState);
        div.appendChild(document.createElement("br"));
        lblPixelPoint = document.createElement("label");
        div.appendChild(lblPixelPoint);
        div.appendChild(document.createElement("br"));
        btnBake = document.createElement("input");
        btnBake.type = "button";
        btnBake.value = "生成网格";
        btnBake.addEventListener("click", onBake);
        div.appendChild(btnBake);
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

export class NavMeshPath implements PathSolution<MapInfo> {
    onLoad(_: MapInfo, cfg: Partial<MapInfo>) {
        let { polys, trans } = cfg;
        if (polys) {
            polygons.length = 1;
            polys
                .forEach(({ points, isEnd }) => {
                    let polygon = new Polygon().setPoints(arrs2Points(points));
                    polygon.isEnd = isEnd;
                    polygons.push(polygon);
                })
        }
        if (trans) {
            trangles = trans.map(points => {
                let [pA, pB, pC] = arrs2Points(points);
                return new Triangle().setPoints(pA, pB, pC);
            });
        }
    }

    readonly name = "导航网格";
    readonly editMapInfoControl = null;
    readonly drawMapPathControl = new DrawMapPathControl;
    setMapData(_: MapInfo) {

    }
    beforeSave(out: MapInfo, _: MapInfo) {
        onBake();
        out.trans = trangles.map(tr => points2Arrs([tr.pA, tr.pB, tr.pC]));
        let polys = [] as Poly[];
        for (let i = 1; i < polygons.length; i++) {
            const { points, isEnd } = polygons[i];
            polys.push({
                isEnd,
                points: points2Arrs(points)
            });
        }
        out.polys = polys;
        out.pathdataB64 = egret.Base64Util.encode(getBytes());
    }

    afterSave(opt: OnSaveOption) {
        const { map, log } = opt;
        const path: typeof import("path") = nodeRequire("path");
        const fs: typeof import("fs") = nodeRequire("fs");
        let bytes = getBytes();
        if (bytes) {
            let file = path.join(Core.basePath, map.path, ConstString.JavaMapPath);
            fs.writeFileSync(file, bytes);
            log(`存储至${file}`);
        }
    }

    onEnterMap() {
        //创建边缘点
        initEdgePoly();

        let bg = $engine.getLayer(jy.GameLayerID.Sorted) as jy.BaseLayer;
        let g = bg.graphics;
        //@ts-ignore
        $engine._bg.drawGrid = function (this: jy.TileMapLayer, x: number, y: number, w: number, h: number, map: MapInfo) {
            //检查polygon是否有点在范围内

            g.clear();
            if ($gm.$showMapGrid) {
                //检查polygon中的点是否在范围内
                let rect = new egret.Rectangle(x, y, w, h);
                for (let i = 1; i < polygons.length; i++) {
                    const poly = polygons[i];
                    let vertexV = poly.points;
                    if (vertexV.find(p => rect.containsPoint(p))) {
                        for (let i = 0; i < vertexV.length; i++) {
                            const v = vertexV[i];
                            g.beginFill(0xff0000, 1)
                            g.drawCircle(v.x, v.y, 5);
                            g.endFill();
                        }
                        let first = vertexV[0];
                        g.lineStyle(2, 0xff0000);
                        if (poly.isEnd) {
                            g.beginFill(0xff0000, 0.3);
                        }
                        g.moveTo(first.x, first.y);
                        for (let i = 1; i < vertexV.length; i++) {
                            const v = vertexV[i];
                            g.lineTo(v.x, v.y);
                        }
                        if (poly.isEnd) {
                            g.lineTo(first.x, first.y);
                            g.endFill();
                        }
                    }
                }
                if (trangles) {
                    g.lineStyle(2, 0xff00);
                    for (let i = 0; i < trangles.length; i++) {
                        const { pA, pB, pC } = trangles[i];
                        if (rect.containsPoint(pA) || rect.containsPoint(pB) || rect.containsPoint(pC)) {
                            g.beginFill(0xff00, 0.1);
                            g.moveTo(pA.x, pA.y);
                            g.lineTo(pB.x, pB.y);
                            g.lineTo(pC.x, pC.y);
                            g.lineTo(pA.x, pA.y);
                            g.endFill();
                        }
                    }
                }
            }
        };
    }
}

interface TmpPoint extends jy.Point {
    idx: number;
}
let bytes: Uint8Array = undefined;
const m16 = 2 ** 16;

function getBytes() {
    if (bytes) {
        return bytes;
    }
    //寻路只需要三角形数据，无需阻挡点数据
    let points = [] as TmpPoint[];
    let trans = [] as number[];
    let idx = 0;
    let pDict = {} as { [key: number]: TmpPoint };
    //检索点的索引
    let tranLen = trangles.length;
    for (let i = 0; i < tranLen; i++) {
        const { pA, pB, pC } = trangles[i];
        trans.push(
            getPoint(pA),
            getPoint(pB),
            getPoint(pC)
        );
    }
    let plen = points.length;

    //数据结构 BigEdian
    //Uint16 存储点的数量 n     (2 bytes)
    //n *  Uint16 x  Uint16 y    (4*n bytes)
    //Uint16 三角形数量 m     (2 bytes)
    //m * 3 Uint16 点索引号     (3*2*m bytes)
    let length = 2 + plen * 4 + 2 + tranLen * 3 * 2;
    bytes = new Uint8Array(length);
    let dv = new DataView(bytes.buffer);
    let pos = 0;
    dv.setUint16(pos, plen);
    pos += 2;
    for (let i = 0; i < points.length; i++) {
        const { x, y } = points[i];
        dv.setUint16(pos, x);
        dv.setUint16(pos + 2, y);
        pos += 4;
    }
    dv.setUint16(pos, tranLen);
    for (let i = 0; i < trans.length; i++) {
        dv.setUint16(pos++, trans[i]);
    }
    return bytes;
    function getPoint(pt: Point) {
        const { x, y } = pt;
        let key = x * m16 + y;
        let tpt = pDict[key];
        if (!tpt) {
            pDict[key] = tpt = { x, y, idx };
            points[idx++] = tpt;
        }
        return tpt.idx;
    }
}