import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import { Core } from "./Core";

const txtMapPath = $g("txtMapPath") as HTMLInputElement;
const view = $g("StateSelectMapDir") as HTMLDivElement;
const btnLoadMapList = $g("btnLoadMapList") as HTMLInputElement;
const btnEdit = $g("btnEdit") as HTMLInputElement;
const dlMapList = $("#dlMapList");

btnLoadMapList.addEventListener("click", onLoadMapListClick);
view.addEventListener("dragover", e => e.preventDefault());
view.addEventListener("drop", onDrop);
btnEdit.addEventListener("click", onEdit);
dlMapList.datalist({ onSelect: checkSelect, textField: "path" });
const MapPathCookie = ConstString.CookiePrefix + "MapPath";
txtMapPath.value = cookie.getCookie(MapPathCookie) || "";

function onEdit() {
    let row = dlMapList.datalist("getSelected");
    if (row) {
        jy.dispatch(AppEvent.StateChange, [AppState.EditMapInfo, row]);
    }
}

function onLoadMapListClick() {
    let basePath = txtMapPath.value.trim();
    if (basePath && fs.existsSync(basePath)) {
        showMapList(basePath);
    }
}
function onDrop(e: DragEvent) {
    e.preventDefault();
    let files = e.dataTransfer.files;
    if (files.length == 1) {
        showMapList(files[0].path);
    } else {
        alert(`请拖入地图文件夹`);
    }
}
function showMapList(basePath: string) {
    //检查文件夹
    if (!fs.statSync(basePath).isDirectory()) {
        return alert(`${basePath}不是地图文件夹`);
    }
    Core.basePath = basePath;
    //检查是否有MapEditor.json文件
    let cfgFile = path.join(basePath, ConstString.CfgFileName);
    if (!fs.existsSync(cfgFile)) {
        return alert(`文件夹中，没有找到配置文件[${cfgFile}]，请检查`);
    }
    //加载配置
    let cfgJSON = fs.readFileSync(cfgFile, "utf8");
    let cfg: GlobalCfg;
    try {
        cfg = JSON.parse(cfgJSON);
    } catch (e) {
        return alert(`配置文件[${cfgFile}]内容有误，请检查`);
    }
    cfg.dbonePath ||= "../dbones";
    cfg.effectPath ||= "../a";
    Core.cfg = cfg;
    cookie.setCookie(MapPathCookie, basePath);
    txtMapPath.value = basePath;
    let maps = Core.maps;
    maps.clear();
    //检查目录，创建地图数据
    let list = fs.readdirSync(basePath);
    list.forEach(dir => {
        //检查子目录数据
        let fullDir = path.join(basePath, dir);
        if (fs.statSync(fullDir).isDirectory() && dir != ConstString.LibPath) {

            //检查是否已经有文件内容
            let map = new jy.MapInfo();
            map.path = dir;
            maps.set(dir, map);
        }
    })
    dlMapList.datalist({
        data: maps.rawList
    })
}

function checkSelect() {
    let row = dlMapList.datalist("getSelected");
    btnEdit.disabled = !row;
}

const state = AppState.SelectMapDir;
export {
    state,
    view,
}