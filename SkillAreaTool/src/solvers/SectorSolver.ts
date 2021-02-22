import { Core } from "../Core.js";
import { getNewTargets } from "../getNewTargets.js";
import { createNumberInput, NumberInputElement } from "../HtmlUtils.js";
import { PointRuntime } from "../PointRuntime.js";

const enum Const {
    MinGridCount = 0,
    DefaultGridCount = 3,
    MaxGridCount = 10,
}


let view: HTMLDivElement;
let radiusInput: NumberInputElement;
let decInput: NumberInputElement;

let radius: number;
let rad: number;
let Targets: PosArea[];

let _viewChange = function () { };
const PI = Math.PI;
const PI2 = PI * 2;
const Dec2Rad = PI / 180;
const Rad2Dec = 180 / PI;
function getEditView() {
    if (!view) {
        view = document.createElement("div");
        let label = document.createTextNode("设置半径(单位：像素)");
        view.appendChild(label);
        const { gridSize } = Core.cfg;
        radiusInput = createNumberInput(gridSize * Const.DefaultGridCount, gridSize * Const.MinGridCount, gridSize * Const.MaxGridCount, setRadius)
        view.appendChild(radiusInput);
        label = document.createTextNode("设置角度");
        view.appendChild(label);
        decInput = createNumberInput(90, 0, 180, setDec)
        view.appendChild(decInput);
    }
    return view;
}

function setDec(value: number) {
    value *= Dec2Rad;
    if (rad != value) {
        rad = value;
        invalidate();
    }
}

function setRadius(value: number) {
    if (radius != value) {
        radius = value;
        invalidate();
    }
}



function setParam(data: SkillParam) {
    let radius = data.range;
    let rad = data.param1;
    radiusInput.setValue(radius);
    decInput.setValue(rad);
    setRadius(radius);
    setDec(rad);
}

let validating = false;
function invalidate() {
    if (!validating) {
        validating = true;
        requestAnimationFrame(validate);
    }
}

function validate() {
    //遍历所有目标数组
    if (Targets) {
        Targets.forEach(checkTargetArea);
    }
    validating = false;
    _viewChange();
}

function bindViewChange(viewChange: { () }) {
    _viewChange = viewChange;
}

function reset() {
    if (Targets) {
        Targets.forEach(posArea => posArea.areas.length = 0);
    }
    radius = undefined;
    rad = undefined;
}

/**
 * 获取目标/范围的数据列表
 */
function getTargets(): PosArea[] {
    if (!Targets) {
        //初始化目标数组
        Targets = getNewTargets();
    }
    return Targets;
}

/**
 * 根据主目标获取绘制路径
 * @param x 
 * @param y 
 */
function getGraphPath(target: Point) {
    const { x, y } = target;
    //计算范围内格子
    const { gridSize } = Core.cfg;
    let rd = Math.atan2(y, x);
    let halfRad = rad * .5;
    let rada = rd + halfRad;
    let radb = rd - halfRad;
    let pax = radius * Math.cos(rada);
    let pay = radius * Math.sin(rada);

    let path = new Path2D();
    let grids = Core.grids;
    let { x: cx, y: cy } = grids.getCenterPX();
    path.moveTo(cx, cy);
    path.lineTo(cx + pax, cy + pay);
    path.arc(cx, cy, radius, rada, radb, true);
    path.lineTo(cx, cy);
    return path;
}

function checkTargetArea(target: PosArea) {
    let grids = Core.grids;
    if (!grids) {
        return
    }
    //得到夹角
    let { target: { x, y } } = target;
    //计算范围内格子
    const { gridSize, percent = 0 } = Core.cfg;
    let halfGridSize = gridSize * .5;
    let rd = Math.atan2(y, x);
    let halfRad = rad * .5;
    let rada = rd + halfRad;
    let radb = rd - halfRad;

    let pax = radius * Math.cos(rada);
    let pay = radius * Math.sin(rada);

    let pbx = radius * Math.cos(radb);
    let pby = radius * Math.sin(radb);


    //重新计算areas
    let halfGrid = Math.ceil((radius / gridSize) * .5) + 1;
    const ex = halfGrid;
    const ey = halfGrid;
    const checker = getChecker(halfGridSize, halfGridSize, radius, rad, pax, pay, pbx, pby);
    const areas = target.areas;
    areas.length = 0;
    for (let x = - halfGrid; x <= ex; x++) {
        for (let y = - halfGrid; y <= ey; y++) {
            let rect = grids.getGridBounds(x, y);
            //遍历检查每点是否在范围内
            let count = rect.checkVertexs(checker)
            if (count > 0) {
                if (percent == 0 || count == 4 || rect.checkArea(checker, percent)) {
                    areas.push(new PointRuntime(x, y));
                }
            }
        }
    }
}

function getChecker(fx: number, fy: number, radius: number, rad: number, pax: number, pay: number, pbx: number, pby: number) {
    const sqRadius = radius * radius;
    return function (x: number, y: number) {
        let dx = fx - x;
        let dy = fy - y;
        let flag = false;
        if (dx || dy) {
            if (dx * dx + dy * dy < sqRadius) {
                if (rad < PI2) {
                    if (rad > PI) {
                        flag = dx * (y - pby) <= dy * (x - pbx) || dx * (y - pay) >= dy * (x - pax);
                    } else {
                        flag = dx * (y - pay) > dy * (x - pax) && dx * (y - pby) < dy * (x - pbx);
                    }
                } else {
                    flag = true;
                }
            }
        } else {
            flag = true;
        }
        return flag;
    }
}

export default {
    type: SkillAreaType.Sector,
    name: "扇形",
    getEditView,
    setParam,
    getTargets,
    getGraphPath,
    bindViewChange,
    getTemp() {
        const tempRadius = radius || 240;
        const tempRad = rad || 90 * Dec2Rad;
        let cfg = {
            id: `${SkillAreaType.Sector}_${tempRadius}_${tempRad}`,
            type: SkillAreaType.Sector,
            range: tempRadius,
            param1: tempRad * Rad2Dec
        } as SkillCfg;
        reset();
        setParam(cfg);
        cfg.area = getTargets();
        return cfg;
    },
    reset
} as AreaSolver