import { DragDele } from "./DragDele";
import AniRender = jy.AniRender;
import AniInfo = jy.AniInfo;
import ResourceBitmap = jy.ResourceBitmap;
import { addRes } from "./res/Res";
const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");
class Main extends egret.DisplayObjectContainer {

    public constructor() {
        super();
        this.addEventListener(EgretEvent.ADDED_TO_STAGE, this.onAddToStage, this);
        $("#btnSave").on("click", saveCallback);
        $("#bgColor").on("change", onbgColorChange);
        jy.Global.initTick();
    }

    onAddToStage() {
        // 绘制中心线
        let sp = new egret.Shape();
        let g = sp.graphics;
        let sw = this.stage.stageWidth;
        let sh = this.stage.stageHeight;
        hh = sh >> 1;
        hw = sw >> 1;
        g.lineStyle(1, 0xff0000);
        g.moveTo(0, hh);
        g.lineTo(sw, hh);
        g.moveTo(hw, 0);
        g.lineTo(hw, sh);

        dragDele = new DragDele;
        this.addChild(dragDele);
        this.addChild(sp);
        window.addEventListener("dragover", onDragOver);
        window.addEventListener("drop", onDrop);

    }
}
let hw: number;
let hh: number;

let currentRender: AniRender;

let dragDele: DragDele;

let cPst: AniInfo;

let dataFile: string;

function onbgColorChange() {
    $g("Main").style.backgroundColor = "#" + ($g("bgColor") as HTMLInputElement).value
}

function saveCallback() {
    let frames = cPst.frames;
    let obj = {};
    for (let a in frames) {
        let aInfo = frames[a];
        if (aInfo && aInfo.frames.length) {
            let m = [];
            obj[a] = m;
            let fs = [];
            m[0] = fs;
            if (aInfo.isCircle) {
                m[1] = 1;
            }
            let aF = aInfo.frames;
            let len = aF.length;
            for (let i = 0; i < len; i++) {
                let frame = aF[i];
                let data: any[] = [+frame.a, +frame.f, +frame.t];
                if (frame.e || frame.d != -1) {//一般情况有事件的可能性多余有特定方向的，所以先e，后d
                    data.push(frame.e || 0);
                    if (frame.d != -1) {
                        data.push(+frame.d);
                    }
                }
                fs[i] = data;
            }
        }
    }
    let rawData = cPst.rawData;
    rawData[0][2] = obj;
    // 将数据写回文件
    fs.writeFileSync(dataFile, JSON.stringify(rawData));
}

function onDragOver(e: DragEvent) {
    e.preventDefault();
}

function onDrop(e: DragEvent) {
    e.preventDefault();
    let goted = checkFile(e.dataTransfer.files);
    if (goted) { // 一定是 Electron 环境才能取到值
        // 加载数据
        let str = fs.readFileSync(goted.data, "utf8");
        let data = JSON.parse(str);
        let rawData = JSON.parse(str);
        let aniRender = new AniRender();
        let pst = new AniInfo();
        cPst = pst;
        let { img, key } = goted;
        pst.init(key, data);
        pst.rawData = rawData;
        let filename = path.basename(img);
        addRes(`${jy.ResPrefix.Ani}${key}/${filename}`, img);
        let dis = jy.recyclable(ResourceBitmap);
        let chkCircle = $("#chkCircle");
        chkCircle.removeAttr("disabled");
        pst.actionInfo.isCircle ? chkCircle.attr("checked", "checked") : chkCircle.removeAttr("checked");
        chkCircle.on("change", _ => {
            pst.actionInfo.isCircle = chkCircle[0]["checked"];
        });
        aniRender.init(pst, dis, 1);
        dis.res = pst.getResource();
        aniRender.play();
        dragDele.setStartPoint(hw, hh);
        dragDele.aniInfo = pst;
        dataFile = goted.data;
        dragDele.addChild(dis);
        addRender(aniRender);
    } else {
        alert("数据不符");
    }
}


function addRender(aniRender: AniRender) {
    let old = currentRender;
    if (old) {
        let dis = old.display;
        if (dis.parent) {
            dis.parent.removeChild(dis);
        }
        old.onRecycle();
    }
    currentRender = aniRender;
    //@ts-ignore
    let pst = aniRender._aniInfo;
    let dg = $('#dg');
    dg["datagrid"]('loadData', pst.frames[0].frames);
}


/**
 * 检查文件列表，看是否目录结构一致
 * @param files
 */
function checkFile(files: FileArray, parent: string = "") {
    // 先检查 pdir中的数据
    //        let v;
    //        try{
    //            v = JSON.parse($("#pdir").val());
    //        } catch(e) {
    //            alert("文件路径规则不是JSON，请检查");
    //            return;
    //        }
    //        if(!v || !v.image || !v.config){
    //            alert("没有image或者config节点");
    //            return;
    //        }
    //        let imgReg = new RegExp(v.image[0]);
    //        let cfgReg = new RegExp(v.config[0]);
    // 必须同时找到
    let goted = null;
    let img = null;
    let data = null;
    // 遍历文件，检查文件是否匹配
    for (let i = 0, len = files.length; i < len; i++) {
        let file = files[i];
        if (path) { // 如果是Electron环境
            let p: string;
            if (typeof file === "string") {
                p = path.join(parent, <string>file);
            }
            else {
                // 检查路径
                p = file["path"];
            }
            p = p.replace(/\\/g, "/");
            let fstats = fs.statSync(p);
            // 如果是文件夹
            if (fstats.isDirectory()) {
                goted = checkFile(fs.readdirSync(p), p);
            } else if (fstats.isFile()) {// 检查文件
                let re = path.parse(p);
                if (re.ext == ".png") {
                    img = p;
                } else if (re.base == "d.json") {
                    data = p;
                }
                if (img && data) {
                    // 得到上级目录
                    let dirs = re.dir.split(path.sep);
                    let key = dirs[dirs.length - 1];
                    goted = { img: img, data: data, key: key };
                }
            }
            if (goted) {
                return goted;
            }
        }
    }
    return null;
}


interface FileArray {
    length: number;
    [index: number]: File | string;
}

window["EgretEntry"] = Main;

egret.runEgret();