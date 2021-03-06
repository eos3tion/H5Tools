import { Core } from "../Core.js";
import { createNumberInput, NumberInputElement } from "../HtmlUtils.js";
import { PointRuntime } from "../PointRuntime.js";
import { PosAreaRuntime } from "../PosArea.js";
const enum Const {
    MinGridCount = 0,
    DefaultGridCount = 3,
    MaxGridCount = 10,
}

const PI2 = Math.PI * 2;

let curSkill: SkillParam;
let radius: number;
let Targets: PosArea[];
let _viewChange = function () { };

function reset() {
    curSkill = undefined;
    radius = undefined;
}
reset();


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



function setParam(data: SkillCfg) {
    let radius = data.range;
    curSkill = data;
    radiusInput.setValue(radius);
    let area = data.area;
    if (area) {
        Targets = data.area;
    }
    setRadius(radius, true);
}

function setRadius(value: number, keepAreas?: boolean) {
    let grids = Core.grids;
    if (!grids) {
        return
    }
    if (radius != value) {
        radius = value;
        if (!Targets || !Targets[0]) {
            return
        }
        let areas = Targets[0].areas;
        if (!keepAreas || areas.length == 0) {
            areas.length = 0;
            const { gridSize, percent = 0 } = Core.cfg;
            let halfGridSize = gridSize * .5;
            const checker = getChecker(halfGridSize, halfGridSize, radius * radius);
            //重新计算areas
            let halfGrid = Math.ceil((radius / gridSize) * .5) + 1;
            const ex = halfGrid;
            const ey = halfGrid;
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
        _viewChange();
    }
    if (curSkill) {
        curSkill.range = radius;
    }
}

function getChecker(fx: number, fy: number, sqRadius: number) {
    return function (x: number, y: number) {
        let dx = fx - x;
        let dy = fy - y;
        return dx * dx + dy * dy < sqRadius;
    }
}



/**
 * 获取目标/范围的数据列表
 */
function getTargets(): PosArea[] {
    return [new PosAreaRuntime({ x: 0, y: 0 })];
}

function getGraphPath() {
    let path = new Path2D();
    let grids = Core.grids;
    let pt = grids.getCenterPX();
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

function bindViewChange(viewChange: { () }) {
    _viewChange = viewChange;
}

export default {
    type: SkillAreaType.Circle,
    name: "圆形",
    getEditView,
    setParam,
    getTargets,
    getGraphPath,
    // getIdentityData,
    bindViewChange,
    // getCurId() {
    //     return getId(radius);
    // },
    getTemp() {
        const tempRadius = radius || 240;
        let cfg = {
            id: getId(tempRadius),
            type: SkillAreaType.Circle,
            range: tempRadius
        } as SkillCfg;
        reset();
        cfg.area = getTargets();
        setParam(cfg);
        return cfg;
    },
    reset
} as AreaSolver


