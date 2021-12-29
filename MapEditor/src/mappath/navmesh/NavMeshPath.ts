import { PathSolution, OnSaveOption } from "../PathSolution";
import { createRadio, Core } from "../../Core";
import Point = egret.Point;
import { Polygon } from "./geom/Polygon";
import { createDelaunay } from "./geom/Delaunay";
import Triangle = jy.Triangle;
import { PB } from "../../pb/PB";

Point.prototype.equals = function equals(this: Point, toCompare: Point) {
    let dx = this.x - toCompare.x;
    let dy = this.y - toCompare.y;
    return dx * dx + dy * dy < 100 //10像素以内当做同一个点
}

function points2Arrs(pts: Point[]) {
    return pts.map(pt => [pt.x, pt.y]) as PointArrList
}

function arrs2Points(arrs: PointArrList) {
    return arrs.map(([x, y]) => new Point(x, y));
}

declare type PointArr = [number, number];

declare type PointArrList = PointArr[];

interface Poly {
    isEnd: boolean;
    points: PointArrList;
}


interface MapInfo extends jy.NavMeshMapInfo {

    $polys: Poly[];

    trans: PointArrList[];
    /**
     * 边框点
     */
    edge: PointArrList;
}

const enum Const {
    radioName = "radBlockPoint",
}

/**
 * 障碍点的状态
 */
const enum BlockPointState {
    None,
    Add,
    Del,
    ModifyEdge,
}

let btnBake: HTMLInputElement;
let btnEmpty: HTMLInputElement;
let state: BlockPointState;
const view = $g("StateEdit");

const edgePoly = new Polygon();

function initEdgePoly() {
    const { width, height, edge } = $engine.currentMap as MapInfo;
    if (edge) {
        edgePoly.setPoints(arrs2Points(edge));
    } else {
        edgePoly.setPoints([
            new Point(),
            new Point(width, 0),
            new Point(width, height),
            new Point(0, height)
        ])
    }
}


const polygons = [edgePoly] as Polygon[];

let triangles: Triangle[];

let currentDraw: Polygon;

function setState() {
    state = +(document.querySelector(`input[name=${Const.radioName}]:checked`) as HTMLInputElement).value;
    window.removeEventListener("keyup", onKeyUp);
    view.removeEventListener("click", onClick);
    edgeControl.clearEvent();
    if (state == BlockPointState.Add || state == BlockPointState.Del) {
        view.addEventListener("click", onClick);
        if (state == BlockPointState.Add) {
            window.addEventListener("keyup", onKeyUp);
        }
    } else if (state == BlockPointState.ModifyEdge) {
        edgeControl.addEvent();
    }
}

const edgeControl = function () {
    let curPt: Point;
    return {
        clearEvent,
        addEvent() {
            view.addEventListener("mousedown", onMouseDown);
        }
    }

    function clearEvent() {
        view.removeEventListener("mousedown", onMouseDown);
        onUpClear();
    }

    function onMouseDown(e: MouseEvent) {
        let pt = getMousePT(e);
        if (!pt) {
            return;
        }
        //检查点是否是边缘点
        curPt = edgePoly.points.find(tpt => tpt.equals(pt));
        if (curPt) {
            view.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        }
    }


    function onMouseMove(e: MouseEvent) {
        let pt = getMousePT(e);
        if (!pt) {
            return;
        }
        if (curPt) {
            curPt.setTo(pt.x, pt.y);
            triansChange();
            redraw();
        }
    }

    function onUpClear() {
        curPt = undefined;
        view.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseUp(e: MouseEvent) {
        let pt = getMousePT(e);
        if (!pt) {
            return;
        }
        if (curPt) {
            curPt.setTo(pt.x, pt.y);
            //检查是否有点和edgePolygon外面，如果有则需要移除poly
            let j = 1;
            for (let i = 1; i < polygons.length; i++) {
                const poly = polygons[i];
                if (poly.points.every(pt => edgePoly.contain(pt))) {
                    polygons[j++] = poly;
                }
            }
            polygons.length = j;
            redraw();
        }
        onUpClear();
    }
}()


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

function getMousePT(e: MouseEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() == "canvas") {
        const { clientX, clientY } = e;
        //转换成格位坐标
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        let { x, y } = pt;
        const { width, height } = $engine.currentMap;
        x = Math.clamp(x, 0, width);
        y = Math.clamp(y, 0, height);
        return new Point(x, y);
    }
}

function onClick(e: MouseEvent) {
    let pt = getMousePT(e);
    if (!pt) {
        return;
    }
    if (!edgePoly.contain(pt)) {
        return;
    }

    if (state == BlockPointState.Add) {
        if (!currentDraw) {
            currentDraw = new Polygon();
            polygons.push(currentDraw);
        }
        //检查点是否和之前的点相同
        let has = currentDraw.find(pt);
        if (has) {//如果已经有很近的点了，不允许绘制，即便是转折点，也不给绘制
            let first = currentDraw.points[0];
            if (has == first) {//回到第一个点了，进行封闭
                currentDraw.isEnd = true;
                currentDraw = undefined;
            }
        } else {
            currentDraw.add(pt);
        }
        triansChange();
        redraw();
    } else if (state == BlockPointState.Del) {
        //检查当前点击的位置，是否离原有的点很近
        let cur: Point;
        let findPoly: Polygon;
        //检查当前点是否和当前`polygon`中的点相近
        for (let i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            cur = polygon.find(pt);
            if (cur) {
                findPoly = polygon;
                break;
            }
        }
        if (cur) {
            currentDraw = findPoly;
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
    triansChange();
    redraw();
}

function triansChange() {
    triangles = undefined;
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
    triangles = createDelaunay(polygons);
    redraw();
}

function onClear() {
    polygons.length = 1;//保留边框
    initEdgePoly();//重置外边框
    triangles = undefined;
    redraw();
}


function showMapGrid() {
    $gm.$showMapGrid = $gm.$defaultMapGridId;
    //监听鼠标事件
    view.addEventListener("mousemove", showCoord);
    $engine.invalidate();
}

function hideMapGrid() {
    currentDraw = undefined;
    window.removeEventListener("keyup", onKeyUp);
    view.removeEventListener("click", onClick);
    $gm.$showMapGrid = 0;
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
        createRadio("设置边框", BlockPointState.ModifyEdge, Const.radioName, div, false, setState);

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
    readonly type = jy.MapPathType.NavMesh;
    onLoad(map: MapInfo, cfg: Partial<MapInfo>) {
        let { $polys: polys, trans, edge } = cfg;
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
            triangles = trans.map(points => {
                let [pA, pB, pC] = arrs2Points(points);
                return new Triangle().setPoints(pA, pB, pC);
            });
        }
        map.edge = edge;
    }

    readonly name = "导航网格";
    readonly editMapInfoControl = null;
    readonly drawMapPathControl = new DrawMapPathControl;
    setMapData(_: MapInfo) {

    }
    beforeSave(out: MapInfo, _: MapInfo) {
        onBake();
        out.trans = triangles.map(tr => points2Arrs([tr.pA, tr.pB, tr.pC]));
        let polys = [] as Poly[];
        for (let i = 1; i < polygons.length; i++) {
            const { points, isEnd } = polygons[i];
            polys.push({
                isEnd,
                points: points2Arrs(points)
            });
        }
        out.$polys = polys;
        out.edge = points2Arrs(edgePoly.points);
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
        let rect = new egret.Rectangle();
        //@ts-ignore
        $engine._bg.drawGrid = function (this: jy.TileMapLayer, x: number, y: number, w: number, h: number, map: MapInfo) {
            //检查polygon是否有点在范围内

            g.clear();
            if ($gm.$showMapGrid) {
                //检查polygon中的点是否在范围内
                rect.setTo(x, y, w, h);
                //绘制边框
                let vertexV = edgePoly.points;

                for (let i = 0; i < vertexV.length; i++) {
                    const v = vertexV[i];
                    g.beginFill(0xff, 1)
                    g.drawCircle(v.x, v.y, 5);
                    g.endFill();
                }
                let first = vertexV[0];
                g.lineStyle(2, 0xff);
                g.moveTo(first.x, first.y);
                for (let i = 1; i < vertexV.length; i++) {
                    const v = vertexV[i];
                    g.lineTo(v.x, v.y);
                }
                g.lineTo(first.x, first.y);
                g.lineStyle();

                for (let i = 1; i < polygons.length; i++) {
                    const poly = polygons[i];
                    let vertexV = poly.points;
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

                if (triangles) {
                    g.lineStyle(2, 0xff00);
                    for (let i = 0; i < triangles.length; i++) {
                        const { pA, pB, pC } = triangles[i];
                        g.beginFill(0xff00, 0.1);
                        g.moveTo(pA.x, pA.y);
                        g.lineTo(pB.x, pB.y);
                        g.lineTo(pC.x, pC.y);
                        g.lineTo(pA.x, pA.y);
                        g.endFill();
                    }
                }
            }
        };
    }

    getMapBytes(_: MapInfo) {
        let mapPB = {} as jy.NavMeshMapInfoPB;
        //寻路只需要三角形数据，无需阻挡点数据
        let points = [] as TmpPoint[];
        let trans = [] as jy.TPointIdxPB[];
        let idx = 0;
        let pDict = {} as { [key: number]: TmpPoint };
        //检索点的索引
        let tranLen = triangles.length;
        for (let i = 0; i < tranLen; i++) {
            const { pA, pB, pC } = triangles[i];
            trans.push({
                a: getPoint(pA),
                b: getPoint(pB),
                c: getPoint(pC)
            });
        }
        let polys = [] as jy.PolyPointIdxPB[];
        let polygons = unionAll();
        let polyLength = polygons.length;
        for (let i = 0; i < polyLength; i++) {
            let { points } = polygons[i];
            polys.push({ idxs: points.map(point => getPoint(point)) });
        }
        mapPB.points = points;
        mapPB.polys = polys;
        mapPB.trians = trans;
        return PB.writeTo(mapPB, jy.MapPBDictKey.NavMeshMapInfoPB);
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
    let tranLen = triangles.length;
    for (let i = 0; i < tranLen; i++) {
        const { pA, pB, pC } = triangles[i];
        trans.push(
            getPoint(pA),
            getPoint(pB),
            getPoint(pC)
        );
    }
    let polys = [] as number[][];
    let polygons = unionAll();
    let polyLength = polygons.length;
    let polyByteLen = 0;
    for (let i = 0; i < polyLength; i++) {
        let { points } = polygons[i];
        polyByteLen += 2 + points.length * 2;
        polys.push(points.map(point => getPoint(point)));
    }

    let plen = points.length;

    //数据结构 BigEdian
    //Uint16 存储点的数量 n     (2 bytes)
    //n *  Uint16 x  Uint16 y    (4*n bytes)
    //Uint16 三角形数量 m     (2 bytes)
    //m * 3 Uint16 点索引号     (3*2*m bytes)
    //Uint16 polys数量 l  (2 bytes)
    //polys  的一个poly  Uint16的点数量 j   j*Uint16点索引号 (2+j*2 bytes)
    let length = 2 + plen * 4 + 2 + tranLen * 3 * 2 + 2 + polyByteLen;
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
    pos += 2;
    for (let i = 0; i < trans.length; i++) {
        dv.setUint16(pos, trans[i]);
        pos += 2;
    }

    dv.setUint16(pos, polyLength);
    pos += 2;
    for (let i = 0; i < polys.length; i++) {
        let poly = polys[i];
        dv.setUint16(pos, poly.length);
        pos += 2;
        for (let j = 0; j < poly.length; j++) {
            dv.setUint16(pos, poly[j]);
            pos += 2;
        }
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