import { createRadio } from "../Core";
import MapInfo = jy.MapInfo;
export interface DrawMapPathControl {
    view: Element;

    /**
     * 打开/关闭 控件时触发
     * @param flag true 打开  
     *  false 关闭
     */
    onToggle(flag: boolean);
}
export interface OnSaveOption {
    map: MapInfo,

    /**
     * 写日志
     */
    log: { (msg: string, color?: string) };
}

export interface PathSolution<T extends MapInfo> {
    readonly name: string;

    /** 
     * 控件，用于注入到`EditMapInfo`状态的控件
     */
    editMapInfoControl: Element;

    /**
     * 控件，用于绘制地图
     */
    drawMapPathControl: DrawMapPathControl;

    /**
     * 初始设置地图数据  
     * 如果已经有配置，会在 `onLoad` 之后执行
     * @param map 
     */
    setMapData(map: T);

    /**
     * 从配置中加载数据时调用的函数
     * @param map 当前的地图数据
     * @param cfg 配置数据
     * @param sizeNotMatch 尺寸是否不匹配
     */
    onLoad(map: T, cfg: Partial<T>, sizeNotMatch?: boolean);

    /**
     * 存储前调用的函数
     * @param out 要存储的数据
     * @param current 当前地图信息
     */
    beforeSave(out: T, current: T);

    /**
     * 存储数据后调用
     * @param opt 
     */
    afterSave(opt: OnSaveOption);
    /**
     * 进入地图前触发
     */
    onEnterMap();

    readonly type?: jy.MapPathType;
}

export declare type $PathSolution = PathSolution<MapInfo>

const enum Const {
    idConDetail = "tdPathDetail",
    idConPathType = "tdPathType",
    idPathType = "radPathType",
}

const dict: { [index: number]: $PathSolution } = {};

let currentMapEditCtrl: Node;
let current: $PathSolution;

function regMapPath(type: jy.MapPathType, mapPath: $PathSolution) {
    //@ts-ignore
    mapPath.type = type;
    dict[type] = mapPath;
}

function onChange(e: Event) {
    let radio = e.currentTarget as HTMLInputElement;
    setType(radio.value);
}

function setType(type: any) {
    let path = dict[type];
    if (path != current) {
        current = path;
        const tdPathDetail = $g(Const.idConDetail) as HTMLTableCellElement;
        if (currentMapEditCtrl) {
            let parent = currentMapEditCtrl.parentNode;
            if (parent) {
                parent.removeChild(currentMapEditCtrl);
            }
        }
        currentMapEditCtrl = path.editMapInfoControl;
        if (currentMapEditCtrl) {
            tdPathDetail.appendChild(currentMapEditCtrl);
        }
    }
}

function showGroups() {
    const tdPathType = $g(Const.idConPathType) as HTMLTableCellElement;
    for (let type in dict) {
        const mp = dict[type];
        if (mp) {
            createRadio(mp.name, type, Const.idPathType, tdPathType, false, onChange);
        }
    }
    //默认选中第一个
    let v = document.querySelector(`[name=${Const.idPathType}]`) as HTMLInputElement;
    if (v) {
        v.checked = true;
        setType(v.value);
    }
}

function initType(value: number) {
    let input = document.querySelector(`input[name="${Const.idPathType}"][value="${value}"]`) as HTMLInputElement;
    if (input) {
        input.checked = true;
    }
    setType(value);
}

export const PathSolution = {
    regMapPath,
    get current() {
        return current;
    },
    showGroups,
    initType
} 