import { Core } from "../Core.js";
import { createNumberInput, NumberInputElement } from "../HtmlUtils.js";
const enum Const {
    MinGridCount = 0,
    DefaultGridCount = 3,
    MaxGridCount = 10,
}

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
    if (radius != value) {
        radius = value;
        const gridSize = Core.cfg.gridSize;
        let areas = Pos0_0.areas;
        areas.length = 0;
        //重新计算areas
        let halfGrid = Math.ceil((radius / gridSize) * .5);
        for (let x = -halfGrid; x <= halfGrid; x++) {
            for (let y = -halfGrid; y <= halfGrid; y++) {

            }
        }
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
    return null
}

export default {
    type: SkillAreaType.Circle,
    name: "圆形",
    getEditView,
    setParam,
    getTargets,
    getGraphPath
} as AreaSolver


