import { Core } from "./Core.js";
import { getGrids } from "./Grid.js";
import { createRadio } from "./HtmlUtils.js";
import { getInput } from "./Input.js";
import { getOutput } from "./Output.js";
import { PosAreaRuntime } from "./PosArea.js";
import CircleSolver from "./solvers/CircleSolver.js";

const enum Const {
    PathCookieKey = "SkillAreaTool_Path",
}


const fs = nodeRequire("fs") as typeof import("fs");
const path = nodeRequire("path") as typeof import("path");
const txtCfg = $g("txtCfg") as HTMLInputElement;
const btnLoad = $g("btnLoad") as HTMLInputElement;
btnLoad.addEventListener("click", loadCfg);

const btnAdd = $g("btnAdd") as HTMLInputElement;
btnAdd.addEventListener("click", addSkill);

const txtName = $g("txtName") as HTMLInputElement;

let editing = false;
let curSkill: SkillCfg;
let solvers: ReturnType<typeof showAreaSolvers>;
/**
 * 当前正在绘制的区域
 */
let curPosArea: PosAreaRuntime;

/**
 * 技能数据列表
 */
const skillList = [] as SkillInput[];
const dgSkillList = getSkillList();

function addSkill() {
    let curSolver = solvers?.curSolver;
    if (!curSolver) {
        return
    }
    let nameDisplay: string, btnLable: string;
    if (editing) {//正在编辑
        //保存
        btnLable = "添加技能";
        if (curSkill) {
            curSkill.area = curSolver.getTargets();
        }
        nameDisplay = "block";
    } else {

        if (!curSkill) {
            let name = txtName.value.trim();
            if (!name) {
                alert(`请先设置技能范围标识`);
                txtName.focus();
                return
            }
            //检查名字是否已经存在
            if (skillList.find(sk => sk.id === name)) {
                alert(`已经有此技能范围标识，请更换`);
                txtName.focus();
                return
            }

            //创建技能，并设置名字
            curSkill = curSolver.getTemp() as SkillCfg;
            if (name) {
                curSkill.id = name;
            }
            curSkill.changed = true;
            Object.setPrototypeOf(curSkill, SkillRuntime);
            //将数据显示到列表，并选中
            skillList.push(curSkill);
            dgSkillList.refresh();
            dgSkillList.select(curSkill);
        } else {
            curSolver.reset();
            curSolver.setParam(curSkill);
        }
        //开始编辑
        btnLable = "保存技能";
        nameDisplay = "none";
    }
    btnAdd.value = btnLable;
    txtName.style.display = nameDisplay;
    editing = !editing;
}


function showAreaSolvers() {
    let view: HTMLElement;
    /**
     * 范围处理器
     */
    const solvers = {
        [SkillAreaType.Circle]: CircleSolver,
    } as { [type in SkillAreaType]: AreaSolver }

    const name = "areaType";
    const parent = $g("areaType");
    const areaCtrl = $g("areaCtrl");

    let curSolver: AreaSolver;

    for (let type in solvers) {
        const solver = solvers[type];
        createRadio(solver.name, solver.type, name, parent, false, onChange);
        solver.bindViewChange(refreshGrids);
    }
    let v = document.querySelector(`[name=${name}]`) as HTMLInputElement;
    if (v) {
        v.checked = true;
        setType(+v.value);
    }


    return {
        init,
        get(type: SkillAreaType) {
            return solvers[type];
        },
        get curSolver() {
            return curSolver;
        }
    }

    function onChange(e: Event) {
        let radio = e.currentTarget as HTMLInputElement;
        setType(+radio.value);

    }
    function init(value: number) {
        let input = document.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;
        if (input) {
            input.checked = true;
        }
        setType(value);
    }

    function setType(type: SkillAreaType) {
        const solver = solvers[type];
        if (curSolver != solver) {
            curSolver = solver;
            let curView = solver.getEditView();
            if (curView != view) {
                if (view) {
                    view.remove();
                }
                view = curView;
                areaCtrl.appendChild(curView);
            }
        }
    }
}


/**
 * 加载主配置
 */
function loadCfg() {
    let file = txtCfg.value.trim();
    if (!file) {
        return alert(`请先填写配置路径`)
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return alert(`未找到配置文件[${file}]，请检查`)
    }

    let cfg: GlobalCfg;
    try {
        let cnt = fs.readFileSync(file, "utf8");
        cfg = JSON.parse(cnt);
    } catch (e) {
        return alert(`无法正确解析配置文件[${file}]，请检查。\n错误：${e.message}`);
    }
    cookie.setCookie(Const.PathCookieKey, file);

    const { percent = 0, gridSize = 80 } = cfg;
    $g("lblGridSize").innerText = gridSize + "";
    $g("lblPercent").innerText = percent * 100 + "%";

    Core.cfg = cfg;
    const grids = getGrids({ gridSize: cfg.gridSize }, $g("canvas") as HTMLCanvasElement);
    Core.grids = grids;

    initCtrl();
}

function initCtrl() {
    const cfg = Core.cfg;
    let rawDatas = getInput(cfg);
    /**
     * 技能全局命名字典
     */
    const dict = {} as SkillIdentityDict;
    let outputData = getOutput(cfg);
    solvers = showAreaSolvers();
    if (rawDatas) {
        for (let i = 0; i < rawDatas.length; i++) {
            const data = rawDatas[i];
            const id = data.id;
            if (!outputData[id]) {
                let solver = solvers.get(data.type);
                if (solver) {//只处理有处理器的数据
                    outputData[id] = data;
                }
            }
            // let solver = solvers.get(data.type);
            // if (solver) {
            //     solver.getIdentityData(data, dict);
            // }
        }
    }
    //检查输出数据，查看是否已经有配置好的数据
    if (outputData) {
        for (let id in outputData) {
            dict[id] = outputData[id];
        }
    }


    for (let id in dict) {
        const cfg = dict[id];
        Object.setPrototypeOf(cfg, SkillRuntime)
        skillList.push(cfg);
    }
    //装载数据
    dgSkillList.refresh();

    btnLoad.disabled = true;

    Core.grids.reset();
}


function checkCookie() {
    let cfgPath = cookie.getCookie(Const.PathCookieKey);
    if (cfgPath) {
        txtCfg.value = cfgPath;
    }
}

checkCookie();

function getSkillList() {
    const dlSkillList = $("#dlSkillList");
    const dlProList = $("#dlPosList");
    const datas = { data: skillList };
    let curTar: SkillCfg;
    let _idx = -1;
    dlSkillList.datalist({
        onSelect(idx: number, row: SkillCfg) {
            curTar = row;
            _idx = idx;
            let area = row.area;
            dlProList.datalist({
                data: area
            })
            if (area.length) {
                dlProList.datalist("selectRow", 0);
            }

        }
    })
    dlProList.datalist({
        onSelect(_: number, row: PosAreaRuntime) {
            curPosArea = row;
            refreshGrids()
        }
    })
    return {
        select(skill: SkillCfg) {
            let idx = skillList.indexOf(skill)
            if (_idx != idx) {
                dlSkillList.datalist("selectRow", idx);
            }
        },
        refresh() {
            dlSkillList.datalist(datas);
        }
    }
}
/**
 * 显示对应数据
 */
function refreshGrids() {
    if (curPosArea) {
        const graph = solvers?.curSolver?.getGraphPath(curPosArea.target);
        const grids = Core.grids;
        grids.reset();
        grids.setAreaGraph(graph);
        grids.setTarget(curPosArea);
    }
}

/**
 * 技能运行时数据
 */
const SkillRuntime = {
    get text() {
        return this.id + (this.changed ? "*" : "");
    }
}