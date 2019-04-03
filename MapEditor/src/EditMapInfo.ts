
import { Core } from "./Core";
import { addRes } from "./res/Res";
import { PathSolution } from "./mappath/PathSolution";
import { GridMapPath } from "./mappath/GridMapPath";
import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $electron from "electron";
const electron: typeof $electron = nodeRequire("electron");

PathSolution.regMapPath(0, new GridMapPath());


const view = $g("StateEditMapInfo");
const lblPath = $g("lblPath") as HTMLLabelElement;
const lblPicHCount = $g("lblPicHCount") as HTMLLabelElement;
const lblPicVCount = $g("lblPicVCount") as HTMLLabelElement;
const lblPicSize = $g("lblPicSize") as HTMLLabelElement;
const lblMapWidth = $g("lblMapWidth") as HTMLLabelElement;
const lblMapHeight = $g("lblMapHeight") as HTMLLabelElement;
// const txtGridWidth = $g("txtGridWidth") as HTMLInputElement;
// const txtGridHeight = $g("txtGridHeight") as HTMLInputElement;
// const lblColumns = $g("lblColumns") as HTMLLabelElement;
// const lblRows = $g("lblRows") as HTMLLabelElement;
const btnDoEdit = $g("btnDoEdit") as HTMLInputElement;
const btnRefreshPath = $g("btnRefreshPath") as HTMLInputElement;

const state = AppState.EditMapInfo;

/**
 * 加载到的地图配置
 */
let cfg: jy.MapInfo;
/**
 * 尺寸是否匹配
 */
let sizeNotMatch: boolean;

// txtGridWidth.addEventListener("change", calGrids);
// txtGridHeight.addEventListener("change", calGrids);
btnRefreshPath.addEventListener("click", e => {
    setData(Core.selectMap);
});
btnDoEdit.addEventListener("click", e => {
    jy.dispatch(AppEvent.StateChange, [AppState.Edit, Core.selectMap]);
});

PathSolution.showGroups();

function setData(map: jy.MapInfo) {
    const solution = PathSolution.current;
    if (!solution) {
        return alert(`请先选择地图路径方案`);
    }


    Core.selectMap = map;
    const basePath = Core.basePath;
    const fullPath = path.join(basePath, map.path);
    //检查是否有配置
    let mapCfgFile = path.join(fullPath, ConstString.MapCfgFileName);

    if (fs.existsSync(mapCfgFile) && fs.statSync(mapCfgFile).isFile()) {
        let mapCfgJson = fs.readFileSync(mapCfgFile, "utf8");
        try {
            cfg = JSON.parse(mapCfgJson);
        } catch (e) {
            console.error(`地图配置[${mapCfgFile}]数据有误`, e.message);
            return
        }
    }
    Core.mapCfg = cfg;
    //遍历地图文件夹中的地图
    let list = fs.readdirSync(fullPath);
    let reg1 = /^(\d{3})(\d{3}).(jpg|png)$/, reg2 = /(\d+)_(\d+).(jpg|png)$/;
    let reg1Count = 0, reg2Count = 0, jpgCount = 0, pngCount = 0;
    let hPicIdx = 0, vPicIdx = 0;
    let sizes = new jy.ArraySet<string[]>();
    let pWidth: number, pHeight: number;
    list.forEach(file => {
        let flag = false;
        if (reg1.test(file)) {
            reg1Count++;
            flag = true;
        } else if (reg2.test(file)) {
            reg2Count++;
            flag = true;
        }
        let isMini = file.startsWith(ConstString.Mini);//mini图
        if (isMini) {
            flag = true;
        }
        if (flag) {
            if (!isMini) {
                let y = +RegExp.$1;
                let x = +RegExp.$2;
                let ext = RegExp.$3;
                if (x > hPicIdx) {
                    hPicIdx = x;
                }
                if (y > vPicIdx) {
                    vPicIdx = y;
                }
                if (ext == "jpg") {
                    jpgCount++;
                } else if (ext == "png") {
                    pngCount++;
                }
            }
            //检查图片尺寸
            let img = electron.nativeImage.createFromPath(path.join(fullPath, file));
            if (!isMini) {
                let { width, height } = img.getSize();
                if (!(height == 1 && width == 1)) {//1×1的图为特殊处理，不计入size中
                    let key = width + "×" + height;
                    let list = sizes.get(key);
                    if (!list) {
                        list = [];
                        sizes.set(key, list);
                    }
                    pWidth = width;
                    pHeight = height;
                    list.push(file);
                }
            }
            addRes(`${map.path}/${file}`, path.join(fullPath, file));
        }
    });

    let hasPic = true;

    if (sizes.size > 1) {
        let dict = sizes.rawDict;
        let msg = `地图中存在多种尺寸: \n`;
        for (let key in dict) {
            msg += `${key}: [${dict[key].join(",")}]\n`
        }
        return alert(msg);
    } else if (sizes.size == 0) {//没有任何图片
        hasPic = false;
    }
    let ext: jy.Ext;
    if (jpgCount && !pngCount) {
        ext = jy.Ext.JPG;
    } else if (!jpgCount && pngCount) {
        ext = jy.Ext.PNG;
    } else {
        return alert(`地图底图中，既有png又有jpg，请检查`)
    }

    let type: number;
    if (reg1Count && !reg2Count) {
        type = 1;
    } else if (reg2Count && !reg1Count) {
        type = 2;
    } else {
        return alert(`地图底图中，有的图片是[0xx0yy]格式的，有的是[x_y]格式的，请检查`);
    }
    sizeNotMatch = false;
    //先将从配置中读取的数据复制到 mapInfo
    if (cfg) {
        let cfgPWidth = cfg.pWidth || ConstNum.PicSize;
        let cfgPHeight = cfg.pHeight || ConstNum.PicSize;
        //检查地图大小是否匹配
        let maxPicX = cfg.maxPicX || cfg.width / cfgPWidth;
        let maxPicY = cfg.maxPicY || cfg.height / cfgPHeight;
        if (cfgPHeight != pHeight || cfgPWidth != pWidth) {
            alert(`检查到地图配置[${mapCfgFile}]中图片大小为[${cfgPWidth}×${cfgPHeight}]和实际图片大小[${pWidth}×${pHeight}]不一致，将已实际图片大小为准`);
            cfgPWidth = pWidth;
            cfgPHeight = pHeight;
        }
        if (maxPicX != hPicIdx && maxPicY != vPicIdx) {
            sizeNotMatch = true;
            alert(`检查到地图配置[${mapCfgFile}]中地图大小和当前文件夹图片文件名得到的地图大小不一致，请检查。\n如果继续操作，将会弃用原地图路径点数据`);
        }
        map.pathdataB64 = cfg.pathdataB64;
        map.effs = cfg.effs;
        map.gridWidth = cfg.gridWidth;
        map.gridHeight = cfg.gridHeight;
    }
    let mpt = jy.MapInfo.prototype;
    if (type == 1) {
        mpt.getImgUri = function (this: jy.MapInfo, uri: string) {
            return `${this.path}/${uri}`;
        }
        mpt.getMapUri = function (this: jy.MapInfo, col: number, row: number): string {
            return `${this.path}/${row.zeroize(3)}${col.zeroize(3)}${this.ext}`;
        }
    } else {
        mpt.getImgUri = function (this: jy.MapInfo, uri: string) {
            return `${this.path}/${uri}`;
        }
        mpt.getMapUri = function (this: jy.MapInfo, col: number, row: number) {
            return `${this.path}/${row}_${col}${this.ext}`;
        }
    }
    map.ext = ext;
    map.type = type;
    map.pWidth = pWidth;
    map.pHeight = pHeight;
    map.maxPicX = hPicIdx;
    map.maxPicY = vPicIdx;
    hPicIdx += 1;
    vPicIdx += 1;
    map.width = hPicIdx * pWidth;
    map.height = vPicIdx * pHeight;
    solution.setMapData(map);
    lblPath.innerText = map.path;
    lblMapWidth.innerText = map.width + "";
    lblMapHeight.innerText = map.height + "";
    lblPicHCount.innerText = hPicIdx + "";
    lblPicVCount.innerText = vPicIdx + "";
    lblPicSize.innerText = map.pWidth + "×" + map.pHeight;
}


export {
    state,
    view,
    setData
}