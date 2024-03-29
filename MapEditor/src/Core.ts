import { $PathSolution, getPathSolution } from "./mappath/PathSolution";
import { TiledMap } from "./tiled/TiledParser";
export const Core = {
    /**
     * 地图列表
     */
    maps: new jy.ArraySet<jy.MapInfo>(),
    /**
     * 基础路径
     */
    basePath: "",
    /**
     * 全局配置
     */
    cfg: null as GlobalCfg,
    /**
     * tiled生成的地图数据
     */
    tiledMap: null as TiledMap,
    /**
     * 隐藏视图
     */
    hide: function (view: HTMLElement) {
        if (view && view.parentElement) {
            view.parentElement.removeChild(view);
        }
    },
    /**
     * 选中的地图，得到的运行时数据
     */
    selectMap: null as jy.MapInfo,
    /**
     * 选中地图文件夹加载的配置数据
     */
    mapCfg: null as jy.MapInfo,
    /**
     * 选中地图文件路径
     */
    mapCfgFile: null as string,
    /**
     * 路径解决方案
     */
    pathSolution: null as ReturnType<typeof getPathSolution>,

    tileDict: null as TileDict
}

export function setMapBit(x: number, y: number, columns: number, pathdata: Uint8Array, flag: any) {
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

export function createRadio(title: string, value: any, name: string, parent: Node, checked: boolean, onChange?: { (ev: Event) }) {
    const doc = document;
    let label = doc.createElement("label");
    parent.appendChild(label);
    let radio = doc.createElement("input");
    radio.value = value;
    radio.name = name;
    radio.checked = checked;
    radio.type = "radio";
    radio.addEventListener("change", onChange);
    label.appendChild(radio);
    let word = doc.createTextNode(title);
    label.appendChild(word);
}

export function log(msg: string) {
    console.log(msg);
}

window["Core"] = Core;