
import { Core } from "./Core";
import { addRes } from "./res/Res";
import { PathSolution } from "./mappath/PathSolution";
import { GridMapPath } from "./mappath/GridMapPath";
import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $electron from "electron";
import { NavMeshPath } from "./mappath/navmesh/NavMeshPath";
import MapInfo = jy.MapInfo;

const electron: typeof $electron = nodeRequire("electron");

//注册路径处理器
PathSolution.regMapPath(jy.MapPathType.Grid, new GridMapPath);
PathSolution.regMapPath(jy.MapPathType.NavMesh, new NavMeshPath);

const view = $g("StateEditMapInfo");
const lblPath = $g("lblPath") as HTMLLabelElement;
const lblPicHCount = $g("lblPicHCount") as HTMLInputElement;
const lblPicVCount = $g("lblPicVCount") as HTMLInputElement;
const lblPicSize = $g("lblPicSize") as HTMLInputElement;
const lblMapWidth = $g("lblMapWidth") as HTMLLabelElement;
const lblMapHeight = $g("lblMapHeight") as HTMLLabelElement;
// const txtGridWidth = $g("txtGridWidth") as HTMLInputElement;
// const txtGridHeight = $g("txtGridHeight") as HTMLInputElement;
// const lblColumns = $g("lblColumns") as HTMLLabelElement;
// const lblRows = $g("lblRows") as HTMLLabelElement;
const btnDoEdit = $g("btnDoEdit") as HTMLInputElement;
const btnRefreshPath = $g("btnRefreshPath") as HTMLInputElement;

const state = AppState.EditMapInfo;

lblPicHCount.addEventListener("change", onChange)
lblPicVCount.addEventListener("change", onChange)
lblPicSize.addEventListener("change", onChange)

/**
 * 手动设置地图数值
 */
function onChange() {
    let picHCount = +lblPicHCount.value;
    let picVCount = +lblPicVCount.value;
    let sizeStr = lblPicSize.value.trim();
    //检查参数
    if (/(\d+)[*×,|](\d+)/.test(sizeStr) && picHCount > 0 && picVCount > 0) {
        let picWidth = +RegExp.$1;
        let picHeight = +RegExp.$2;
        if (picWidth > 0 && picHeight > 0) {
            resizeMap(Core.selectMap, picWidth, picHeight, picHCount, picVCount);
        }
    }
}

/**
 * 加载到的地图配置
 */
let cfg: MapInfo;
/**
 * 尺寸是否匹配
 */
let sizeNotMatch: boolean;

// txtGridWidth.addEventListener("change", calGrids);
// txtGridHeight.addEventListener("change", calGrids);
btnRefreshPath.addEventListener("click", _ => {
    setData(Core.selectMap);
});
btnDoEdit.addEventListener("click", _ => {
    jy.dispatch(AppEvent.StateChange, [AppState.Edit, Core.selectMap]);
});

PathSolution.showGroups();

function setData(map: MapInfo) {
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
    Core.mapCfgFile = mapCfgFile;
    let pathType = cfg && cfg.pathType || jy.MapPathType.NavMesh;
    PathSolution.initType(pathType);

    const solution = PathSolution.current;
    if (!solution) {
        return alert(`请先选择地图路径方案`);
    }

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
        msg += `是否继续编辑？`
        if (!confirm(msg)) {
            return
        }
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
        let { maxPicX, maxPicY } = cfg;
        maxPicX = maxPicX ? maxPicX + 1 : cfg.width / cfgPWidth;
        maxPicY = maxPicY ? maxPicY + 1 : cfg.height / cfgPHeight;
        let sizeNotMatch = false;
        let changeSize = false;
        if (cfgPHeight != pHeight || cfgPWidth != pWidth) {
            changeSize = confirm(`检查到地图配置[${mapCfgFile}]中图片大小为[${cfgPWidth}×${cfgPHeight}]和实际图片大小[${pWidth}×${pHeight}]不一致，是否已实际图片大小为准`);
            if (changeSize) {
                cfgPWidth = pWidth;
                cfgPHeight = pHeight;
            } else {
                pWidth = cfgPWidth;
                pHeight = cfgPHeight;
            }
        }
        if (maxPicX != hPicIdx || maxPicY != vPicIdx) {
            sizeNotMatch = true;
            if (!changeSize) {
                hPicIdx = maxPicX;
                vPicIdx = maxPicY;
            }
        }
        map.effs = cfg.effs;
        solution.onLoad(map, cfg, sizeNotMatch);
    }
    let mpt = MapInfo.prototype;
    if (type == 1) {
        mpt.getImgUri = function (this: MapInfo, uri: string) {
            return `${this.path}/${uri}`;
        }
        mpt.getMapUri = function (this: MapInfo, col: number, row: number): string {
            return `${this.path}/${row.zeroize(3)}${col.zeroize(3)}${this.ext}`;
        }
    } else {
        mpt.getImgUri = function (this: MapInfo, uri: string) {
            return `${this.path}/${uri}`;
        }
        mpt.getMapUri = function (this: MapInfo, col: number, row: number) {
            return `${this.path}/${row}_${col}${this.ext}`;
        }
    }
    map.ext = ext;
    map.type = type;
    lblPath.innerText = map.path;

    resizeMap(map, pWidth, pHeight, hPicIdx, vPicIdx);
}

function resizeMap(map: MapInfo, pWidth: number, pHeight: number, hPicCount: number, vPicCount: number) {
    map.pWidth = pWidth;
    map.pHeight = pHeight;
    map.maxPicX = hPicCount - 1;
    map.maxPicY = vPicCount - 1;
    map.width = hPicCount * pWidth;
    map.height = vPicCount * pHeight;
    lblMapWidth.innerText = map.width + "";
    lblMapHeight.innerText = map.height + "";
    lblPicHCount.value = hPicCount + "";
    lblPicVCount.value = vPicCount + "";
    lblPicSize.value = pWidth + "×" + pHeight;
    PathSolution.current.setMapData(map);
}


export {
    state,
    view,
    setData
}