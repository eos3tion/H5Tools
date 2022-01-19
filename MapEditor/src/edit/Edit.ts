import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $http from "http";

import { HGameEngine } from "./HGameEngine";
import { AniDele } from "./AniDele";
import { Core } from "../Core";
import { PathSolution, EditMapControl, getPathSolution } from "../mappath/PathSolution";
import { PB } from "../pb/PB";
import { prepareEffs, checkDrop, createEff, regMapEffFactorys } from "./effs/MapEffDisplay";
import { GridMapPath } from "../mappath/grid/GridMapPath";
import { StaggeredMapPath } from "../mappath/staggered/StaggeredMapPath";
import { getDrawMapPathControl, MapInfo } from "../mappath/GridDrawMapPathControl";
import { GridableMapInfo, GridablePath } from "../mappath/GridAblePath";


const enum CtrlName {
    MapPathCtrl = "divMapPath",
    EffectList = "divEffList",
    AreaGroup = "divAreaGroup",

    MapLayerExt = "MapLayerExt_",
    MapLayerChkSaveToClientName = "saveToClient",
}

let curCtrl: string;


const ctrlDict = {} as { [id: string]: EditMapControl };

window["ctrlDict"] = ctrlDict;

const accControl = $("#accControl");

const createMapLayerDele = function () {
    let layerId = jy.GameLayerID.CeilEffect + 1;
    const layerPlus = .001;

    let dragPane: HTMLElement;
    let txtName: HTMLInputElement;
    let solution: typeof PathSolution;
    const btnCreateMapLayer = $g("btnCreateMapLayer");
    btnCreateMapLayer.addEventListener("click", showPane);
    let showId = 0;
    return {
        createWithData
    }
    function createWithData(data: jy.SubPath) {
        init();
        initSolution(data, data.pathType);
        const map = solution.map;
        map.id = data.id;
        (map as jy.SubPath).saveToClient = data.saveToClient;
        createMapLayer(map);
    }
    function showPane() {
        init();
        txtName.value = "";
        document.body.appendChild(dragPane);
        initSolution();
    }
    function initSolution(map?: jy.SubPath, type = jy.MapPathType.Grid) {
        solution.reset();
        solution.initType(type);
        showId = $gm.$showMapGrid;
        $gm.$showMapGrid = 0;
        const mapInfo = new jy.MapInfo();
        const sMap = Core.selectMap;
        mapInfo.width = sMap.width;
        mapInfo.height = sMap.height;
        solution.onLoad(mapInfo, map || sMap);
        solution.current.setMapData(mapInfo);
    }

    function hidePane() {
        $gm.$showMapGrid = showId;
        let parent = dragPane.parentNode;
        if (parent) {
            parent.removeChild(dragPane);
        }
    }

    function create() {
        let name = txtName.value.trim();
        if (!name) {
            alert(`请输入子地图标识`);
            return
        }
        hidePane();
        const map = solution.map;
        map.id = name;
        createMapLayer(map);
    }

    function createMapLayer(map: jy.SubPath) {
        HGameEngine.addLayerConfig(layerId, jy.GameLayerID.GameScene, jy.TileMapLayer);
        const layer = $engine.getLayer(layerId) as jy.TileMapLayer;
        solution.onBeforeEdit(map);
        layer.currentMap = map;
        const ctrl = getDrawMapPathControl($g("StateEdit"), solution.current as GridablePath<GridableMapInfo>);
        ctrl.setMapLayerId(layerId);
        (ctrl as EditMapControl).onSave = subMapOnSave;
        const id = CtrlName.MapLayerExt + layerId;
        const view = ctrl.view;
        const div = document.createElement("div");
        view.appendChild(div);
        //增加删除按钮
        const btn = document.createElement("input");
        btn.type = "button";
        btn.value = "删除图层";
        btn.onclick = delLayer(id);
        div.appendChild(btn);

        const label = document.createElement("label");
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.id = CtrlName.MapLayerChkSaveToClientName;
        label.append(chk);
        label.append("数据也会保存至客户端");
        chk.checked = !!map.saveToClient;
        div.appendChild(label);

        view.id = id;
        ctrlDict[id] = ctrl;

        accControl.add(view);
        accControl.accordion("add", {
            title: getTitle(map.id),
            panel: view
        });

        layerId += layerPlus;
    }

    function delLayer(id) {
        return function () {
            if (confirm("确定要删除图层么？")) {
                const ctrl = ctrlDict[id] as any as ReturnType<typeof getDrawMapPathControl>;
                delete ctrlDict[id];
                if (ctrl) {
                    const view = ctrl.view;
                    const solution = ctrl.getOpt() as GridablePath<GridableMapInfo>;
                    const map = solution.map;
                    accControl.accordion("remove", getTitle(map.id));
                    $(view).remove();
                    const layerId = ctrl.getMapLayerId();
                    $engine.sleepLayer(layerId);
                }
            }
        }
    }

    function getTitle(id: jy.Key) {
        return `格子图层-${id}`;
    }

    function subMapOnSave(this: ReturnType<typeof getDrawMapPathControl>, map: jy.MapInfo) {
        const sol = this.getOpt() as GridablePath<GridableMapInfo>;
        let dict = map.subPaths;
        if (!dict) {
            map.subPaths = dict = {};
        }
        const subMap = sol.getMap();
        if (subMap) {
            const subInfo = subMap.getSpecObject("pathType") as GridableMapInfo;
            sol.beforeSave(subInfo, subMap);
            let view = this.view;
            let chk = view.querySelector(`#${CtrlName.MapLayerChkSaveToClientName}`) as HTMLInputElement;
            let saveToClient = chk.checked;
            if (saveToClient) {
                (subInfo as jy.SubPath).pathData = sol.getMapBytes(subMap);
            }
            (subInfo as jy.SubPath).saveToClient = saveToClient;

            dict[subMap.id] = subInfo;
        }
    }

    function init() {
        if (dragPane) {
            return
        }
        dragPane = document.createElement("div");
        const mapLayerCfgPane = document.createElement("div");
        mapLayerCfgPane.id = "mapLayerCfgPane"
        dragPane.append(mapLayerCfgPane);
        const style = dragPane.style;
        style.background = "#fafafa";
        style.position = "absolute";
        style.zIndex = "2001";
        style.top = "40%";
        style.left = "30%";

        const divPathType = document.createElement("div");
        divPathType.appendChild(document.createTextNode(`路径方式:`));
        mapLayerCfgPane.append(divPathType);
        const radioPane = document.createElement("span");
        divPathType.appendChild(radioPane);

        const pathDetail = document.createElement("div");
        divPathType.appendChild(pathDetail);

        const divName = document.createElement("div");
        mapLayerCfgPane.append(divName);
        divName.appendChild(document.createTextNode(`地图标识:`))
        txtName = document.createElement("input");
        divName.append(txtName);

        const btnCreate = document.createElement("input");
        btnCreate.value = "创建";
        btnCreate.type = "button";
        btnCreate.size = 20;
        btnCreate.addEventListener("click", create);
        mapLayerCfgPane.appendChild(btnCreate);

        $(mapLayerCfgPane).panel({
            title: "创建路径格图层",
            width: 300,
            height: 200,
            tools: [{
                iconCls: "panel-tool-close",
                handler: hidePane
            }, {}]
        })

        $(dragPane).draggable({
            handle: ".panel-header"
        })
        solution = getPathSolution({ tdPathDetail: pathDetail, tdPathType: radioPane })
        solution.regMapPathFactory(jy.MapPathType.Grid, GridMapPath);
        solution.regMapPathFactory(jy.MapPathType.Staggered, StaggeredMapPath);
        solution.showGroups();
    }

}()

function mapPathCtrlInit() {
    const current = PathSolution.current;


    const drawMapPathControl = current.drawMapPathControl;
    $("#divMapPath").append(drawMapPathControl.view);
    ctrlDict[CtrlName.MapPathCtrl] = drawMapPathControl;

    const areaGroupControl = current.areaGroupControl;
    if (areaGroupControl) {
        $("#divAreaGroup").append(areaGroupControl.view);
        ctrlDict[CtrlName.AreaGroup] = areaGroupControl;
    }

    accControl.accordion({
        onUnselect: checkSelect,
        onSelect: checkSelect
    });

    for (let id in ctrlDict) {
        const ctrl = ctrlDict[id];
        if (ctrl.onInit) {
            ctrl.onInit(currentMap);
        }
    }
    return checkSelect();

    function checkSelect() {
        jy.Global.callLater($checkSelect, 0)
    }
    function $checkSelect() {
        let select = accControl.accordion("getSelected");
        let flag = false;
        let ctxId: string;
        if (select) {
            let ctx = select.context;
            if (ctx && ctx.id == "divMapPath") {
                flag = true;
            }
            ctxId = ctx.id;
        }
        if (curCtrl != ctxId) {
            let old = ctrlDict[curCtrl];
            if (old) {
                old.onToggle(false);
            }
            curCtrl = ctxId;
            let ctrl = ctrlDict[curCtrl];
            if (ctrl) {
                ctrl.onToggle(true);
            } else if (curCtrl == CtrlName.EffectList) {
                $gm.$showMapGrid = chkShowMapGrid.checked ? $gm.$defaultMapGridId : 0;
            }
            $engine.invalidate();
        }
    }
}



jy.ConfigUtils.getResUrl = function (uri: string) {
    return uri;
}

class Entry extends egret.Sprite {
    constructor() {
        super();
        this.on(EgretEvent.ADDED_TO_STAGE, this.onAdded, this);
    }

    async onAdded() {
        //创建地图
        jy.GameEngine.init(this.stage, HGameEngine);
        // jy.Global.initTick();
        //地编不删除已经加载的数据
        jy.ResManager.init(Infinity);
        await showMap();
        mapPathCtrlInit();
    }
}

window["EgretEntry"] = Entry;

const view = $g("StateEdit");

/**
 * 用于显示特效列表的Div
 */
const divEffectPro = $("#divEffectPro");
const divControl = $("#divControl");
$("#bgColor").on("change", function () {
    view.style.backgroundColor = "#" + this.value;
})
divControl.draggable({
    handle: ".panel-header"
})

const btnSave = $("#btnSave");
btnSave.on("click", saveMap);

const btnEditGroup = $("#btnEditGroup");
btnEditGroup.on("click", editGroup);

const btnHide = $("#btnHide");
btnHide.on("click", hideEffs);

const btnShow = $("#btnShow");
btnShow.on("click", showEffs);

function hideEffs() {
    const effs = $engine.effs;
    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        if (eff.selected) {
            eff.visible = false;
        }
    }
    refreshEffectList();
}

function showEffs() {
    const effs = $engine.effs;
    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        if (eff.selected) {
            eff.visible = true;
        }
    }
    refreshEffectList();
}

function editGroup() {
    $["messager"].prompt("", "添加分组标识", groupId => {
        groupId = groupId.trim();
        const effs = $engine.effs;
        for (let i = 0; i < effs.length; i++) {
            const eff = effs[i];
            if (eff.selected) {
                eff.group = groupId;
            }
        }
        refreshEffectList();
    });

}

divEffectPro.hide();


const dlEffectList = $("#dlEffectList");
let chkShowMapGrid = $g("chkShowMapGrid") as HTMLInputElement;
chkShowMapGrid.addEventListener("change", onChkMapGridShowChange);

function onChkMapGridShowChange() {
    $gm.$showMapGrid = chkShowMapGrid.checked ? $gm.$defaultMapGridId : 0;
    $engine.invalidate();
}

const chkHideEffectList = $g("chkHideEffectList") as HTMLInputElement;
chkHideEffectList.addEventListener("change", onChkHideEffectListChange);
let _hideEffList = false;
function onChkHideEffectListChange() {
    if (_hideEffList !== chkHideEffectList.checked) {
        _hideEffList = chkHideEffectList.checked;
        if (!_hideEffList) {
            refreshEffectList();
            dlEffectList.show();
        } else {
            dlEffectList.hide();
        }
    }

}

function effListFun(...args) {
    if (_hideEffList) {
        return
    }
    return dlEffectList.tree(...args);
}
effListFun({
    onSelect: selectEff,
    onCheck: checkEff,
    textField: "text"
});

const state = AppState.Edit;
let currentMap: jy.MapInfo;

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);
document.addEventListener("selectstart", e => e.preventDefault());

let shiftDown = false;

function onKeyDown(e: KeyboardEvent) {
    if (e.key == "Shift") {
        shiftDown = true;
    }
}

function onKeyUp(e: KeyboardEvent) {
    if (e.key == "Shift") {
        shiftDown = false;
    }
}

let _effDragging = false;

jy.on(MapEvent.StartDragEff, function () {
    _effDragging = true;
})

jy.on(MapEvent.StopDragEff, function () {
    _effDragging = false;
})


view.addEventListener("dragover", e => e.preventDefault());
view.addEventListener("drop", onDrop);
async function onDrop(e: DragEvent) {
    e.preventDefault();
    await checkDrop(e, $engine.effs);
    refreshEffectList();
}


async function setData(map: jy.MapInfo) {
    regMapEffFactorys();
    currentMap = map;
    let effs = map.effs;
    if (effs) {
        await prepareEffs(effs);
    }
    jy.dispatch("BeforeRunEgret");
    egret.runEgret({ renderMode: "webgl" });

    //初始化 subPaths
    const subPaths = Core.mapCfg?.subPaths;
    if (subPaths) {
        for (let id in subPaths) {
            const subPath = subPaths[id];
            subPath.id = id;
            createMapLayerDele.createWithData(subPath);
        }
    }
}

let lx: number, ly: number;
async function showMap() {
    await $engine.enterMap(currentMap as jy.MapInfo);
    view.addEventListener("mousedown", checkDragStart);
    $engine.invalidate();
    PathSolution.current.onEnterMap(currentMap);
    refreshEffectList();
}

let dragStartPt = { x: 0, y: 0 };
let dragState: number;
let dragSt = 0;

function getNow() {
    return Date.now();
}

function mousePt2MapPt(mouseX: number, mouseY: number) {
    let dpr = window.devicePixelRatio;
    let pt = $engine._bg.globalToLocal(mouseX / dpr, mouseY / dpr);
    return pt
}

function checkDragStart(e: MouseEvent) {
    if (!(e.target instanceof HTMLCanvasElement)) {
        return
    }
    let button = e.button;
    dragState = button;
    dragSt = getNow();
    let flag = true;
    if (button == 2) {
        lx = e.clientX;
        ly = e.clientY;
    } else if (button == 0) {
        if (_effDragging) {
            flag = false;
        } else {
            dragStartPt.x = e.clientX;
            dragStartPt.y = e.clientY;

        }
    }
    if (flag) {
        view.addEventListener("mousemove", dragMove);
        view.addEventListener("mouseup", dragEnd);
    }
}

function dragMove(e: MouseEvent) {
    let { clientX, clientY } = e;
    if (dragState == 2) {
        let dx = lx - clientX;
        let dy = ly - clientY;
        const scale = $engine.scale;
        dx /= scale;
        dy /= scale;
        lx = clientX;
        ly = clientY;
        let camera = $engine.camera;
        let rect = camera.rect;
        camera.moveTo(rect.x + rect.width * .5 + dx, rect.y + rect.height * .5 + dy);
    } else if (curCtrl == CtrlName.EffectList && dragState == 0 && !_effDragging) {
        let layer = $engine.getLayer(jy.GameLayerID.TopEffect) as jy.BaseLayer;
        let g = layer.graphics;
        g.clear();
        g.lineStyle(1, 0x00ff00);
        let { x, y } = dragStartPt;
        g.drawRect(x, y, clientX - x, clientY - y);
    }
}

function dragEnd(e: MouseEvent) {
    if (curCtrl == CtrlName.EffectList) {
        if (dragState == 0) { //拉框操作        
            let layer = $engine.getLayer(jy.GameLayerID.TopEffect) as jy.BaseLayer;
            let g = layer.graphics;
            g.clear();

            let { clientX, clientY } = e;
            let { x, y } = dragStartPt;
            let width = clientX - x;
            let height = clientY - y;

            let now = getNow();

            if (now - dragSt > 200 && width * width + height * height >= 100) {
                let pt = $engine._bg.globalToLocal(x, y);
                //计算框选到的效果
                checkSelect(pt.x, pt.y, width, height);
            }
        }
    }
    view.removeEventListener("mousemove", dragMove);
    view.removeEventListener("mouseup", dragEnd);
}

function checkSelect(x: number, y: number, width: number, height: number) {
    let rect = new egret.Rectangle(x, y, width, height);
    const effs = $engine.effs;
    let j = 0;
    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        if (rect.contains(eff.x, eff.y)) {
            eff.select(true);
        } else {
            if (!shiftDown) {
                eff.select(false);
            }
        }
    }
    checkSelection();
}

let checkingSelectionData = false;

function checkSelection() {
    checkingSelectionData = true;
    const effs = $engine.effs;
    const needUncheckTargets = [];
    const checkedEffs: AniDele[] = effListFun("getChecked");
    for (let i = 0; i < checkedEffs.length; i++) {
        const eff = effs[i];
        if (!eff.selected) {
            let target = $("#" + (eff as any).domId)[0];
            if (target) {
                needUncheckTargets.push(target);
            }
        }
    }
    const willCheckTargets = [];

    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        if (eff.selected && !checkedEffs.includes(eff)) {

            let target = $("#" + (eff as any).domId)[0];
            if (target) {
                willCheckTargets.push(target);
            }
        }
    }
    for (const target of needUncheckTargets) {
        effListFun("uncheck", target);
    }
    for (const target of willCheckTargets) {
        effListFun("check", target);
    }
    checkingSelectionData = false;
}


function checkEff(data: AniDele | { children: AniDele[] }) {
    if (checkingSelectionData) {
        return
    }
    if (isAniDele(data)) {
        tickEff(data);
    } else {
        let datas = data.children;
        for (let i = 0; i < datas.length; i++) {
            tickEff(datas[i]);
        }
    }
    checkSelection();
}
function isAniDele(data: AniDele | { children: AniDele[] }): data is AniDele {
    return !data["children"]
}

function tickEff(data: AniDele) {
    if (data) {
        if (data.selected) {
            data.select(false);
        } else {
            data.select(true);
            $engine.camera.moveTo(data.x, data.y);
        }
    }
}

/**
 * 选中特效
 */
function selectEff(data: AniDele | { children: AniDele[] }) {
    if (checkingSelectionData || !isAniDele(data)) {
        return
    }

    if (data) {
        const effs = $engine.effs;
        //清理数据
        for (let i = 0; i < effs.length; i++) {
            const eff = effs[i];
            if (eff != data) {
                eff.select(false);
            }
        }

        tickEff(data);
    }
    checkSelection();
}

let refreshing = 0;
function refreshEffectList() {
    clearTimeout(refreshing);
    refreshing = setTimeout($refreshEffectList, 100) as any;
}
function $refreshEffectList() {
    if (_hideEffList) {
        return
    }
    let effs = $engine.effs;
    let groups = {} as { [group: number]: { text: string, children: AniDele[] } }
    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        let g = eff.group || "";
        let group = groups[g];
        if (!group) {
            groups[g] = group = { text: g, children: [] };
        }
        group.children.push(eff);
    }
    let data = [];
    for (let g in groups) {
        data.push(groups[g]);
    }
    effListFun({ data });
}

jy.on(AppEvent.EffectChange, refreshEffectList)

jy.on(AppEvent.RemoveEffect, e => {
    let dele = e.data;
    $engine.effs.remove(dele);
    refreshEffectList();
})

jy.on(AppEvent.CopyEffect, async e => {
    let data = e.data as MapEffData;
    data.x += 50;
    data.y += 50;
    let render = await createEff(data);
    if (render) {
        let dele = new AniDele(data, render);
        $engine.effs.pushOnce(dele);
    }
    refreshEffectList();
});

/**
 * 存储当前地图数据
 */
function saveMap() {
    if (!currentMap) {
        return;
    }
    for (let id in ctrlDict) {
        const ctrl = ctrlDict[id];
        if (ctrl.onSave) {
            ctrl.onSave(currentMap);
        }
    }
    const mapCfgFile = path.join(Core.basePath, currentMap.path, ConstString.MapCfgFileName);

    //将数据写入文件
    let out = currentMap.getSpecObject("path", "ext", "ftype", "pWidth", "pHeight", "maxPicX", "maxPicY", "subPaths") as jy.MapInfo;
    out.tiledData = Core.tiledMap;
    let solution = PathSolution.current;
    out.pathType = solution.type;

    solution.beforeSave(out, currentMap);

    let effDeles: AniDele[] = $engine.effs;
    let len = effDeles.length;
    if (len) {
        let effs = [] as MapEffData[];
        const layers = [jy.GameLayerID.BottomEffect, jy.GameLayerID.CeilEffect, jy.GameLayerID.UnderMap];
        for (let i = 0; i < effDeles.length; i++) {
            let dele = effDeles[i];
            let dat = dele.data;
            dat.uri = dele.render?.uri || dat.uri;
            dat.layer = layers.indexOf(dat.layerID);
            dat.scaleX = dat.sX * 100 | 0;
            dat.scaleY = dat.sY * 100 | 0;
            let type = dele.render?.type;
            if (type) {
                dat.type = type;
            }
            effs[i] = dat;
        }
        out.effs = effs;
    }
    let pb = getMapInfoPB(currentMap);
    pb.type = solution.type | 0;
    pb.data = solution.getMapBytes(currentMap);
    let mapBytes = PB.writeTo(pb, jy.MapPBDictKey.MapInfoPB);
    out.mapBytesB64 = egret.Base64Util.encode(mapBytes.buffer);
    fs.writeFileSync(mapCfgFile, JSON.stringify(out));
    log(`存储到[${mapCfgFile}]`);

    solution.afterSave({ map: currentMap, log });


    let endAction = Core.cfg.endAction;
    if (endAction) {
        //执行一下当前目录的提交操作
        if (confirm("请先手动提交文件，以便进行后续操作，如果取消将不进行后续操作")) {
            var http: typeof $http = nodeRequire("http");
            http.get(endAction, res => {
                let chunks: Buffer[] = [];
                res.on("data", chunk => {
                    chunks.push(chunk as Buffer);
                });
                res.on("end", () => {
                    let result = Buffer.concat(chunks).toString("utf8");
                    result = result.replace(/\n/g, "<br/>")
                    log(result);
                })
            })
        }
    }

}

function getMapInfoPB(map: jy.MapInfo) {
    let pb = {} as jy.MapInfoPB;
    pb.extType = +(map.ext == jy.Ext.PNG);
    pb.id = +map.path;
    pb.pHeight = map.pHeight;
    pb.pWidth = map.pWidth;
    pb.width = map.width;
    pb.height = map.height;
    if (!Core.tiledMap) {
        let noPic = map.noPic;
        if (noPic) {
            pb.noPic = new jy.ByteArray(noPic.buffer);
        }
    }
    let effs = map.effs;
    let out = [] as MapEffData[];
    if (effs) {
        for (let i = 0; i < effs.length; i++) {
            const eff = effs[i];
            let group = eff.group;
            //检查分组
            if (group && group.startsWith("*")) {
                continue;
            }
            out.push(eff);
        }
    }
    pb.effs = out as jy.MapEffPB[];
    let subPaths = map.subPaths;
    let subPathsPB = [] as jy.SubPathPB[];
    for (const id in subPaths) {
        const subPath = subPaths[id];
        if (subPath.saveToClient) {
            let subPathPB = {
                id,
                type: subPath.pathType,
                data: subPath.pathData
            }
            subPathsPB.push(subPathPB);
        }
    }
    pb.subPaths = subPathsPB;
    let tiledMap = Core.tiledMap;
    if (tiledMap) {
        let layers = tiledMap.layerData.map(data => new jy.ByteArray(new Uint32Array(data).buffer));
        pb.tiledMap = {
            cols: tiledMap.cols,
            rows: tiledMap.rows,
            tileWidth: tiledMap.tileWidth,
            tileHeight: tiledMap.tileHeight,
            layers
        } as jy.TiledMapPB;
    }
    return pb;
}

const txtLog = $g("txtLog");
function log(msg: string, color = "#000000") {
    txtLog.innerHTML += color ? `<font color="${color}">${msg}</font><br/>` : `${msg}<br/>`;
}
function error(msg: string, err?: Error) {
    let errMsg = "";
    if (err) {
        errMsg = `
<font color="#f00"><b>err:</b></font>
${err.message}
<font color="#f00"><b>stack:</b></font>
${err.stack}`
    }
    log(`<font color="#f00">${msg}</font>${errMsg}`);
    console.error(msg, err);
}
export {
    state,
    view,
    setData
}