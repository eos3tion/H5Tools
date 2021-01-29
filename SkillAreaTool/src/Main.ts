import { Core } from "./Core.js";
import { getGrids } from "./Grid.js";
import { createRadio } from "./HtmlUtils.js";
import { getInput } from "./Input.js";
import { getOutput } from "./Output.js";
import CircleSolver from "./solvers/CircleSolver.js";

const enum Const {
    PathCookieKey = "SkillAreaTool_Path",
}


const fs = nodeRequire("fs") as typeof import("fs");
const path = nodeRequire("path") as typeof import("path");
const txtCfg = $g("txtCfg") as HTMLInputElement;
const btnLoad = $g("btnLoad") as HTMLInputElement;
btnLoad.addEventListener("click", loadCfg);



function showAreaSolvers() {
    /**
     * 范围处理器
     */
    const solvers = {
        [SkillAreaType.Circle]: CircleSolver,
    } as { [type in SkillAreaType]: AreaSolver }

    const name = "areaType";
    const parent = $g("areaType");
    const areaCtrl = $g("areaCtrl");

    for (let type in solvers) {
        const solver = solvers[type];
        createRadio(solver.name, solver.type, name, parent, false, onChange);
    }
    let v = document.querySelector(`[name=${name}]`) as HTMLInputElement;
    if (v) {
        v.checked = true;
        setType(+v.value);
    }

    let view: HTMLElement;

    return {
        init,
        get(type: SkillAreaType) {
            return solvers[type];
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

    Core.cfg = cfg;
    Core.grids = getGrids({ gridSize: cfg.gridSize }, $g("canvas") as HTMLCanvasElement);


    let rawDatas = getInput(cfg);
    /**
     * 技能全局命名字典
     */
    const dict = {} as SkillIdentityDict
    let outputData = getOutput(cfg);
    let solvers = showAreaSolvers();
    if (rawDatas) {
        for (let i = 0; i < rawDatas.length; i++) {
            const data = rawDatas[i];
            let solver = solvers.get(data.type);
            if (solver) {
                solver.getIdentityData(data, dict);
            }
        }
    }
    //检查输出数据，查看是否已经有配置好的数据
    if (outputData) {
        
    }
}


function checkCookie() {
    let cfgPath = cookie.getCookie(Const.PathCookieKey);
    if (cfgPath) {
        txtCfg.value = cfgPath;
    }

}

checkCookie();