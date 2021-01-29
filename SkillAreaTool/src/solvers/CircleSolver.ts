import { Core } from "../Core.js";
import { createNumberInput, NumberInputElement } from "../HtmlUtils.js";
const enum Const {
    MinGridCount = 0,
    DefaultGridCount = 3,
    MaxGridCount = 10,
}

const PI2 = Math.PI * 2;

let radius: number;
let view: HTMLDivElement;
let radiusInput: NumberInputElement;
function getEditView() {
    if (!view) {
        view = document.createElement("div");
        let label = document.createTextNode("设置半径(单位：像素)");
        view.appendChild(label);
        const { gridSize } = Core.cfg;
        radiusInput = createNumberInput(gridSize * Const.DefaultGridCount, gridSize * Const.MinGridCount, gridSize * Const.MaxGridCount, setRadius)
        view.appendChild(radiusInput);
    }
    return view;
}



function setParam(data: SkillParam) {
    let radius = data.range;
    radiusInput.setValue(radius);
    setRadius(radius);
}

function setRadius(value: number) {
    let grids = Core.grids;
    if (!grids) {
        return
    }
    if (radius != value) {
        radius = value;
        const { x: centerX, y: centerY } = grids.getCenter();
        const { gridSize, percent = 0 } = Core.cfg;
        const checker = getChecker(centerX, centerY, radius * radius)
        let areas = Pos0_0.areas;
        areas.length = 0;
        //重新计算areas
        let halfGrid = Math.ceil((radius / gridSize) * .5);
        for (let x = -halfGrid; x <= halfGrid; x++) {
            for (let y = -halfGrid; y <= halfGrid; y++) {
                let rect = grids.getGridBounds(x, y);
                //遍历检查每点是否在范围内
                let count = rect.checkVertexs(checker)
                if (count > 0) {
                    if (percent == 0 || count == 4 || rect.checkArea(checker, percent)) {
                        areas.push({ x, y });
                    }
                }
            }
        }
    }
}

function getChecker(fx: number, fy: number, sqRadius: number) {
    return function (x: number, y: number) {
        let dx = fx - x;
        let dy = fy - y;
        return dx * dx + dy * dy < sqRadius;
    }
}


const Pos0_0 = { target: { x: 0, y: 0 }, areas: [] } as PosArea;
const Targets = [Pos0_0]

/**
 * 获取目标/范围的数据列表
 */
function getTargets(): PosArea[] {
    return Targets;
}

function getGraphPath() {
    let path = new Path2D();
    let grids = Core.grids;
    let pt = grids.getCenter();
    path.arc(pt.x, pt.y, radius, 0, PI2);
    return path;
}

function getIdentityData(cfg: SkillInput, dict: SkillIdentityDict) {
    let { range, param1 } = cfg;
    let id1 = getId(range);
    let cfg1 = dict[id1];
    if (!cfg1) {
        dict[id1] = cfg;
    }
    if (param1 && param1 != range) {
        let id2 = getId(param1);
        let cfg2 = dict[id2];
        if (!cfg2) {
            dict[id2] = cfg;
        }
    }
}

function getId(radius: number) {
    return `${SkillAreaType.Circle}_${radius}`;
}

export default {
    type: SkillAreaType.Circle,
    name: "圆形",
    getEditView,
    setParam,
    getTargets,
    getGraphPath,
    getIdentityData,
} as AreaSolver


