import { createRadio } from "../Core";
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
    map: jy.MapInfo,

    /**
     * 写日志
     */
    log: { (msg: string, color?: string) };
}

export interface PathSolution {
    readonly name: string;

    /** 
     * 控件，用于注入到`EditMapInfo`状态的控件
     */
    editMapInfoControl: Element;

    /**
     * 控件，用于绘制地图
     */
    drawMapPathControl: DrawMapPathControl;

    setMapData(map: jy.MapInfo);

    getDataB64(pathdata: Uint8Array);

    onSave(opt: OnSaveOption);

    onEnterMap();
}

const enum Const {
    idConDetail = "tdPathDetail",
    idConPathType = "tdPathType",
    idPathType = "radPathType",
}

const dict: { [index: number]: PathSolution } = {};

let currentMapEditCtrl: Node;
let current: PathSolution;

function regMapPath(type: number, mapPath: PathSolution) {
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
    let doc = document;
    for (let type in dict) {
        const mp = dict[type];
        if (mp) {
            createRadio(mp.name, type, Const.idPathType, tdPathType, false, onChange);
        }
    }
    //默认选中第一个
    let v = doc.querySelector(`[name=${Const.idPathType}]`) as HTMLInputElement;
    if (v) {
        v.checked = true;
        setType(v.value);
    }
}

export const PathSolution = {
    regMapPath,
    get current() {
        return current;
    },
    showGroups
} 