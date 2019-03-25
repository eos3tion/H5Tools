import { tool } from "./Tool";
import * as _fs from "fs";
import * as _electron from "electron";

const enum GuideTargetType {
    /**
     * 普通视图对象
     */
    Normal = 0,
    /**
     * Render的皮肤，没有名字的那种
     */
    RenderSkin = 1,
    /**
     * 面板，有模块ID，可以根据模块id打开对应面板
     */
    Panel = 2,
}

interface GuideTarget extends Array<any> {
    /**
     * 目标名字
     */
    0: GuideTargetType;
    /**
     * Render的索引号
     */
    1: any;
}

interface StepData {
    desc?: string;
    data: GuideTarget[] | string;
    arrow?: ArrowType;
    img: string;
}

const ArrowName = {
    [ArrowType.Auto]: "自动",
    [ArrowType.Up]: "上",
    [ArrowType.Down]: "下",
    [ArrowType.Left]: "左",
    [ArrowType.Right]: "右",
    [ArrowType.Event]: "派发事件"
}
class StepInfo {
    desc: string;
    data: GuideTarget[];

    get dataJson() {
        return JSON.stringify(this.data);
    }
    arrow?: ArrowType;

    get arrowName() {
        return ArrowName[this.arrow | 0];
    }

    img: string;

    get step() {
        let rows = dg.datagrid("getRows");
        return rows.indexOf(this) + 1;
    }

    toData(): GuideData {
        let { arrow, desc, data } = this;
        let out: GuideData = [data];
        if (desc) {
            out[1] = 0;
            out[2] = desc;
        }
        if (arrow) {
            out[1] = arrow;
        }
        return out;
    }
}

interface GuideData extends Array<any> {
    /**
     * 引导数据
     */
    0: GuideTarget[],
    /**
     * 箭头数据
     */
    1?: number,
    /**
     * 描述信息
     */
    2?: string,
}

class GuideCfg {
    get text(): string {
        return this.name;
    }
    name: string
    steps: StepInfo[];

    changed?: boolean;

    static fromRaw(name: string, datas: GuideData[]) {
        let cfg = new GuideCfg();
        cfg.name = name;
        cfg.steps = datas.map(data => {
            let [target, arrow, desc] = data;
            let step = new StepInfo();
            step.arrow = arrow;
            step.data = target;
            step.desc = desc;
            return step;
        });
        return cfg;
    }
}

function copyData(from: StepData, to: StepData) {
    to.arrow = from.arrow;
    to.data = from.data;
    to.desc = from.desc;
    to.img = from.img;
}


let gameFrame = $g("GameFrame") as HTMLIFrameElement;
const toolHelper = tool(gameFrame);


let guideCfgs: GuideCfg[] = [];
let cfgsPath: string;

function getCookie(name: string) {
    return cookie.getCookie(ConstString.ProjectKey + "_" + name);
}

function setCookie(name: string, data) {
    cookie.setCookie(ConstString.ProjectKey + "_" + name, data);
}

($g("GameUrl") as HTMLInputElement).value = getCookie("GameUrl");

//===============================引导列表相关=========================================================
const dlGuides = $("#Guides");

let currentGuide: GuideCfg;
let currentGuideIdx: number;

dlGuides.datalist({
    onSelect(idx, row) {
        currentGuide = row;
        currentGuideIdx = idx;
        if (!currentGuide.steps) {
            currentGuide.steps = [];
        }
        $g("GuideItem").style.display = "block";
        dg.datagrid({
            data: currentGuide.steps
        })
    }
})

$g("btnLoad").onclick = async function loadGame() {
    let url = ($g("GameUrl") as HTMLInputElement).value;
    setCookie("GameUrl", url);
    gameFrame.src = url;
    $g("GuideItem").style.display = "none";
    $g("GuideList").style.display = "none";
    //先清空当前数据
    guideCfgs.length = 0;
    dlGuides.datalist({ data: guideCfgs });
    cfgsPath = null;
    let cfg;
    try {
        cfg = await toolHelper.loadToolCfg(url);
    } catch{ }
    if (cfg) {
        let projectCfg = cfg[ConstString.ProjectKey];
        if (projectCfg) {
            cfgsPath = projectCfg.cfgs;
            let fs: typeof _fs = nodeRequire("fs");
            if (fs.existsSync(cfgsPath)) {
                try {
                    let data = fs.readFileSync(cfgsPath, "utf8");
                    let rawGuideCfgs = JSON.parse(data);
                    let i = 0;
                    for (let name in rawGuideCfgs) {
                        guideCfgs[i++] = GuideCfg.fromRaw(name, rawGuideCfgs[name]);
                    }
                    guideCfgs.length = i;
                } catch (e) {
                    error(e);
                    return;
                }
            }
        }
    }
    $g("GuideList").style.display = "block";
    dlGuides.datalist({ data: guideCfgs })
}
function checkName() {
    let txtGuideName = $g("txtGuideName") as HTMLInputElement;
    let name = txtGuideName.value.trim();
    if (!name) {
        alert(`请先填写引导名称`);
        txtGuideName.focus();
        return;
    }
    let idx = guideCfgs.findIndex(data => data.name == name);
    if (idx > -1) {
        alert(`已有此名字的配置`);
        dlGuides.datalist('selectRow', idx);
        return;
    }
    return name;
}

$g("btnRenameGuide").onclick = function () {
    let name = checkName();
    if (!name) {
        return;
    }
    if (!currentGuide) {
        alert(`必须先选中一个引导才可以进行重命名`);
        return;
    }
    currentGuide.name = name;
    dg.datagrid('refreshRow', dg.datagrid("getRowIndex", currentGuide));
}

$g("btnNewGuide").onclick = function () {
    let name = checkName();
    if (!name) {
        return;
    }
    let idx = -1;
    for (let i = 0; i < guideCfgs.length; i++) {
        if (name < guideCfgs[i].name) {
            idx = i;
            break;
        }
    }
    let row = new GuideCfg();
    row.changed = true;
    row.name = name;
    if (idx == -1) {
        idx++;
        dlGuides.datalist('appendRow', row);
    } else {
        dlGuides.datalist("insertRow", {
            index: idx,
            row
        });
    }
    dlGuides.datalist("selectRow", idx);
    ($g("txtGuideName") as HTMLInputElement).value = "";
}

$g("btnSaveGuides").onclick = function () {
    let obj = {};
    for (let i = 0; i < guideCfgs.length; i++) {
        let cfg = guideCfgs[i];
        let steps = cfg.steps;
        if (steps && steps.length) {
            obj[cfg.name] = steps.map(step => step.toData());
        }
    }
    let content = JSON.stringify(obj);
    let flag: boolean;
    if (cfgsPath) {
        let fs: typeof _fs = nodeRequire("fs");
        try {
            fs.writeFileSync(cfgsPath, content);
            flag = true;
        } catch (e) {
            error(e);
        }
    }
    if (!flag) {
        const electron: typeof _electron = nodeRequire("electron");
        electron.dialog.showSaveDialog({ title: "存储引导文件", defaultPath: "Guide.json" });
    }
}

$g("btnDelGuide").onclick = function () {
    if (!currentGuide) {
        alert("请先选择要删除的引导");
        return;
    }
    if (!confirm(`确认要删除"${currentGuide.name}"`)) {
        return;
    }
    dlGuides.datalist("deleteRow", currentGuideIdx);
}


//===============================单个引导内容=========================================================

const dg = $('#dg');
let curImg = $g("current") as HTMLImageElement;
let txtDesc = $g("txtDesc") as HTMLTextAreaElement;
let txtData = $g("txtData") as HTMLInputElement;

let currentRow: StepInfo;
let currentIdx: number;
let tmpData = {} as StepData;

function getStepType() {
    return +(document.querySelector("input[name=arrow]:checked") as HTMLInputElement).value;
}

dg.datagrid({
    onSelect(idx, row) {
        currentIdx = idx;
        currentRow = row;
        if (row) {
            let isArrow = getStepType() != ArrowType.Event;
            setTemp(currentRow, isArrow);
            //发送录制的指令
            toolHelper.sendTo(GuideCmdType.Record_T);

        }
    }
})

function setTemp(data: StepData, isArrow?: boolean) {
    copyData(data, tmpData);
    if (isArrow) {
        let arrow = ~~tmpData.arrow;
        let radio = document.querySelector(`input[name=arrow][value="${arrow}"]`) as HTMLInputElement;
        radio.checked = true;
    } else {
        txtData.value = data.data as string || "";
    }
    txtDesc.value = data.desc || "";
    curImg.src = data.img || "";
}

$g("btnInsert").onclick = function () {
    addRow(idx => idx);
}

$g("btnAdd").onclick = function () {
    addRow(idx => idx + 1)
}

$g("btnApply").onclick = function apply() {
    if (currentRow && tmpData) {
        tmpData.desc = txtDesc.value;
        let arrow = getStepType();
        if (arrow == ArrowType.Event) {
            tmpData.data = txtData.value || undefined;
        } else if (currentRow.arrow == ArrowType.Event) {//之前是事件，现在不是了
            tmpData.data = undefined;
        }
        tmpData.arrow = arrow;
        //将临时数据写入
        copyData(tmpData, currentRow);
        dg.datagrid("refreshRow", currentIdx);
    }
    toolHelper.sendTo(GuideCmdType.Save_T);
}

$g("btnReject").onclick = function () {
    //撤销步骤
    setTemp(currentRow);
    dg.datagrid('refreshRow', currentIdx);
}

$g("btnRemove").onclick = function apply() {
    dg.datagrid("deleteRow", currentIdx);
    for (let i = currentIdx; i < currentGuide.steps.length; i++) {
        dg.datagrid('refreshRow', i);
    }
    currentIdx = undefined;
    currentRow = undefined;
}

$g("btnDoGuide").onclick = function () {
    if (currentGuide) {
        toolHelper.sendTo(GuideCmdType.DoGuide_T, currentGuide.steps.map(step => ({
            desc: step.desc,
            data: step.data,
            arrow: step.arrow
        })));
    } else {
        alert("请先选择引导");
    }
}

toolHelper.reg(GuideCmdType.RecordItemBitmap_G, cmd => {
    let [, data] = cmd;
    setTemp(data);
});

/**
 * 增加一行数据
 * @param select 选中的情况下处理索引的函数
 */
function addRow(select: { (idx: number): number }) {
    let row = dg.datagrid('getSelected');
    let idx = -1;
    if (row) {
        idx = dg.datagrid("getRowIndex", row);
    }
    let newRow = new StepInfo();
    let len = dg.datagrid("getRows").length;
    if (idx == -1) {
        dg.datagrid('appendRow', newRow);
        idx = len - 1;
    } else {
        idx = select(idx);
        $('#dg').datagrid("insertRow", {
            index: idx,
            row: newRow
        });
    }
    len++;
    for (let i = idx + 1; i < len; i++) {
        dg.datagrid('refreshRow', i);
    }
    dg.datagrid('selectRow', idx);
}

/**
 * 输出日志
 */
function log(msg: string, color?: string) {
    if (color) {
        console.log("%c" + msg, `color:${color}`);
    } else {
        console.log(msg);
    }
    msg = msg.replace(/\r\n|\n/g, "<br/>");
    if (color) {
        msg = `<font color="${color}">${msg}</font>`
    }
    let txtLog = $g("txtLog");
    if (txtLog) {
        txtLog.innerHTML += `[${new Date().format("HH:mm:ss")}] ${msg} <br/>`;
    }
}

/**
 * 输出错误
 */
function error(msg: string | Error) {
    if (msg instanceof Error) {
        msg = `message:${msg.message}\nstack:\n${msg.stack}`;
    }
    log(msg, "#f00");
}