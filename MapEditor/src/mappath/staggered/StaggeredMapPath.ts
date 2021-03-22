import { PathSolution, OnSaveOption, EditMapControl } from "../PathSolution";
import { Core, createRadio } from "../../Core";
import { PB } from "../../pb/PB";
import getMapDataHelper = jy.getMapDataHelper;

const enum Const {
    radioName = "radMapPath",
}
interface MapInfo extends jy.StaggeredMapInfo {
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

function fillGrids(val: number) {
    let pathdata = getMap().pathdata;
    pathdata.fill(val);
    $engine.invalidate();
}

const view = $g("StateEdit");

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

    readonly drawMapPathControl = getDrawMapPathControl(view);

    readonly areaGroupControl = getAreaGroupControl(view);

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
    // let mask = getCurMapWalkableMask();
    // let v = pathdata.find(v => v != mask);
    // if (v != undefined) {//检查pathdata中的数据,如果全部可走，则返回空
    return egret.Base64Util.encode(pathdata.buffer);
    // }
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


function getDrawMapPathControl(view: HTMLElement) {
    const div = document.createElement("div");
    let btnEmpty = document.createElement("input");
    btnEmpty.type = "button";
    btnEmpty.value = "全部可走";
    btnEmpty.addEventListener("click", function () {
        if (confirm(`确定全部可走？`)) {
            fillWalkable();
        }
    });
    div.appendChild(btnEmpty);
    div.appendChild(document.createTextNode("  "));
    let btnFull = document.createElement("input");
    btnFull.type = "button";
    btnFull.value = "全部不可走";
    btnFull.addEventListener("click", function () {
        if (confirm(`确定全部不可走？`)) {
            fillGrids(0);
        }
    });
    div.appendChild(btnFull);
    div.appendChild(document.createElement("br"));
    let lblPixelPoint = document.createElement("label");
    div.appendChild(lblPixelPoint);
    div.appendChild(document.createElement("br"));
    let lblGridPoint = document.createElement("label");
    div.appendChild(lblGridPoint);
    div.appendChild(document.createElement("br"));

    let checked = false;
    return {
        get view() {
            if (!checked) {
                checkComponent();
            }
            return div
        },
        onToggle
    }

    function checkComponent() {
        createRadio("不可走", 0, Const.radioName, div, false);
        createRadio("可走", 1, Const.radioName, div, true);
        for (let i = 2; i <= gridLevel; i++) {
            createRadio(`可走${i}`, i, Const.radioName, div, true);
        }
        checked = true;
    }

    function onToggle(flag: boolean) {
        if (flag) {
            showMapGrid();
        } else {
            hideMapGrid();
        }
    }

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
        view.removeEventListener("mousedown", onBegin);
        view.removeEventListener("mousemove", showCoord);
        $gm.$showMapGrid = false;
    }


    function showCoord(e: MouseEvent) {
        const { clientX, clientY } = e;
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
        pt = getMap().screen2Map(pt.x, pt.y);
        lblGridPoint.innerText = `格位坐标：${pt.x},${pt.y}`;
    }

    function fillWalkable() {
        fillGrids(getCurMapWalkableMask())
    }
}

function getAreaGroupControl(view: HTMLElement): EditMapControl {
    const div = document.createElement("div");
    let btnNew = document.createElement("input");
    btnNew.type = "button";
    btnNew.value = "新建分组";
    btnNew.addEventListener("click", createNewGroup);
    div.appendChild(btnNew);
    let tree = document.createElement("div");
    div.appendChild(tree);
    let groups = new jy.ArraySet<AreaGroupItem>();
    let $tree = $(tree);
    let curSel: JQuery;
    let graphics: egret.Graphics
    $tree.accordion({
        onSelect: onPanelSelect
    })

    let isShow: boolean;

    return {
        get view() {
            return div;
        },
        onToggle,
        onSave(map: MapInfo) {
            let rawList = groups.rawList;
            let points = [];
            for (let i = 0; i < rawList.length; i++) {
                const group = rawList[i];
                let pts = group.points;
                if (pts.length) {
                    let point = {
                        id: group.id,
                        points: pts.concat()
                    }
                    points.push(point);
                }
            }
            map.points = points;
        },
        onInit(map: MapInfo) {
            let layer = $engine.getLayer(jy.GameLayerID.CeilEffect) as jy.BaseLayer;
            graphics = layer.graphics;
            let points = map.points;
            if (points) {
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    addGroup(point.id, point.points);
                }
            }
        }
    }

    function createNewGroup() {
        $["messager"].prompt("", "添加分组标识", groupId => {
            if (!groupId) {
                return
            }
            groupId = groupId.trim();
            let data = groups.get(groupId);
            if (!data) {
                addGroup(groupId, []);
            }
        });
    }

    function addGroup(groupId: string, points: jy.Point[]) {
        let group = { id: groupId, points: points.map(pt => getPoint(pt.x, pt.y)) } as AreaGroupItem;
        groups.set(groupId, group)
        $tree.accordion('add', {
            title: groupId,
            selected: true
        });
        let panel = $tree.accordion('getPanel', groupId);
        if (panel) {
            group.panel = panel;
            initPanel(panel, group);
        }
    }

    function onPanelSelect(groupId: string) {
        //检查当前选中
        let nSel = $tree.accordion('getPanel', groupId);
        if (curSel != nSel) {
            if (curSel) {
                clearPoints();
            }
            curSel = nSel;
            if (curSel) {
                refreshPoints();
            }
        }
    }

    function onToggle(flag: boolean) {
        isShow = flag;
        if (flag) {
            showMapGrid();
        } else {
            hideMapGrid();
        }
    }

    function showMapGrid() {
        $gm.$showMapGrid = true;
        //监听鼠标事件
        view.addEventListener("mousedown", onBegin);
        $engine.invalidate();
        refreshPoints();
    }

    function onBegin(e: MouseEvent) {
        if (!curSel || (e.target as HTMLElement).tagName.toLowerCase() !== "canvas") {
            return
        }

        if (e.button == 0) {
            view.addEventListener("mousemove", onMove);
            view.addEventListener("mouseup", onEnd);
            onMove(e);
        }
    }

    function onMove(e: MouseEvent) {
        let group = getGroup();
        if (!group) {
            return;
        }
        const { clientX, clientY } = e;
        //转换成格位坐标
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        pt = getMap().screen2Map(pt.x, pt.y);
        let flag = +curSel.find(`input[name=${getGroupRadioName(group.id)}]:checked`).val();
        setPoint(pt.x, pt.y, group, flag);
        $engine.invalidate();
    }

    function onEnd() {
        if (!curSel) {
            return
        }
        view.removeEventListener("mousemove", onMove);
        view.removeEventListener("mouseup", onEnd);
    }

    function setPoint(x: number, y: number, group: AreaGroupItem, flag: number) {
        //数据添加到children中
        let children = group.points
        let old = children.find(pt => pt.x == x && pt.y == y);
        if (flag) {
            if (!old) {
                children.push(getPoint(x, y))
                //在地图上显示
                refreshPoints();
            }
        } else if (old) {
            children.remove(old)
            //在地图上显示
            refreshPoints();
        }
    }

    function getPoint(x: number, y: number): Point {
        let pt = { x, y };
        Object.setPrototypeOf(pt, {
            get text() {
                return `x:${this.x},y:${this.y}`
            }
        })
        return pt;
    }

    function clearPoints() {
        graphics.clear();
    }

    function refreshPoints(refresh = true) {
        clearPoints();
        let group = getGroup();
        if (group) {
            let map = getMap();
            if (map && isShow) {
                let children = group.points;
                for (let i = 0; i < children.length; i++) {
                    let pt = children[i];
                    graphics.beginFill(pt.selected ? 0xffff00 : 0xffff);
                    pt = map.map2Screen(pt.x, pt.y, true);
                    graphics.drawCircle(pt.x, pt.y, 5);
                    graphics.endFill();
                }
            }
            if (refresh) {
                group.list.datalist({ data: group.points });
            }
        }
    }

    function getGroup(panel?: JQuery) {
        panel = panel || curSel;
        if (panel) {
            let groupId = panel.panel("options").title;
            let group = groups.get(groupId);
            return group;
        }
    }

    function hideMapGrid() {
        onEnd();
        view.addEventListener("mousedown", onBegin);
        $gm.$showMapGrid = false;
        clearPoints();
    }

    function initPanel(panel: JQuery, group: AreaGroupItem) {
        let id = group.id;
        //创建控件
        let btnClear = document.createElement("input");
        btnClear.type = "button";
        btnClear.value = "全部清理";
        btnClear.setAttribute("groupId", id);
        btnClear.addEventListener("click", clearAll);
        panel.append(btnClear);

        //创建列表
        let list = document.createElement("div");
        list.style.height = "100px";
        panel.append(list);
        let $list = $(list).datalist({
            data: group.points,
            onSelect: onPointSelect,
            textField: "text"
        });


        let panelEle = panel.get(0);

        let radioName = getGroupRadioName(id);

        createRadio("删除坐标", 0, radioName, panelEle, false);
        createRadio("添加新坐标", 1, radioName, panelEle, true);

        let btnDel = document.createElement("input");
        btnDel.type = "button";
        btnDel.value = "删除";
        btnDel.setAttribute("groupId", id);
        btnDel.addEventListener("click", delPoint);
        panel.append(btnDel);

        group.list = $list;
    }

    function getGroupRadioName(id: string) {
        return `AreaGroup${id}`
    }

    function clearAll(e: MouseEvent) {
        if (confirm(`确认要清除所有点么？`)) {
            let btn = e.currentTarget as HTMLInputElement;
            let id = btn.getAttribute("groupId");
            let group = groups.get(id);
            group.points.length = 0;
            refreshPoints();
        }
    }

    function onPointSelect(idx: number, point: jy.Point) {
        let group = getGroup();
        if (group) {
            const points = group.points;
            if (points[idx] == point) {
                for (let i = 0; i < points.length; i++) {
                    const pt = points[i];
                    pt.selected = pt == point;
                }
            }
            refreshPoints(false);
        }
    }

    function delPoint() {
        let group = getGroup();
        if (group) {
            let select = group.list.datalist("getSelected");
            if (select) {
                const points = group.points;
                let j = 0;
                for (let i = 0; i < points.length; i++) {
                    const pt = points[i];
                    if (pt != select) {
                        points[j++] = pt;
                    }
                }
                points.length = j;
                refreshPoints();
            }
        }
    }
}


type Point = jy.Point & { selected?: boolean }
interface AreaGroupItem {
    id: string;
    panel?: JQuery;
    points: Point[];
    list?: JQuery;
}