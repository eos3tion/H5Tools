import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $http from "http";

import { HGameEngine } from "./HGameEngine";
import { AniDele } from "./AniDele";
import { Core } from "../Core";
import { PathSolution, EditMapControl } from "../mappath/PathSolution";
import { PB } from "../pb/PB";
import { prepareEffs, checkDrop, createEff, regMapEffFactorys } from "./effs/MapEffDisplay";

const enum CtrlName {
    MapPathCtrl = "divMapPath",
    EffectList = "divEffList",
    AreaGroup = "divAreaGroup",
}

let curCtrl: string;
const ctrlDict = {} as { [id: string]: EditMapControl };

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

    $("#accControl").accordion({
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
        let select = $("#accControl").accordion("getSelected");
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
            } else if (curCtrl == CtrlName.EffectList) {
                $gm.$showMapGrid = false;
            }
            curCtrl = ctxId;
            let ctrl = ctrlDict[curCtrl];
            if (ctrl) {
                ctrl.onToggle(true);
            } else if (curCtrl == CtrlName.EffectList) {
                $gm.$showMapGrid = true;
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
function effListFun(...args) {
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
    for (let i = 0; i < effs.length; i++) {
        const eff = effs[i];
        let target = $("#" + (eff as any).domId)[0];
        if (target) {
            effListFun(eff.selected ? "check" : "uncheck", target);
        }
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
    let out = currentMap.getSpecObject("path", "ext", "ftype", "pWidth", "pHeight", "maxPicX", "maxPicY") as jy.MapInfo;
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
    let noPic = map.noPic;
    if (noPic) {
        pb.noPic = new jy.ByteArray(noPic.buffer);
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
    let tiledMap = Core.tiledMap;
    if (tiledMap) {
        let layers = tiledMap.layerData.map(data => new jy.ByteArray(new Uint8Array(data)));
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