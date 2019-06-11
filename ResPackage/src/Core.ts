import { Progress } from "./Progress";
import { GrowingPacking } from "packing/GrowingPacking";
import { BinPacking } from "packing/BinPacking";
const _project = "ResPackage";
const _progress = new Progress().bindProgress($("#progress") as HTMLProgressElement).bindLabel($("#lblProgress"));
const _total = new Progress().bindProgress($("#total") as HTMLProgressElement).bindLabel($("#lblTotal"));
const txtLog = $("#txtLog") as HTMLDivElement;

//检查是否可以使用缩放
let canResize = (function () {
    let electron: typeof import("electron") = nodeRequire("electron");
    let test = electron.nativeImage.createEmpty();
    let pt = test.constructor.prototype;
    //早期版本的electron没有getBitmap方法
    if (typeof pt.getBitmap === "undefined") {
        pt.getBitmap = pt.toBitmap;
    }
    return typeof pt.resize === "function";
})();
if (!canResize) {
    alert("当前版本无法进行缩放图片操作，如需缩放图片，请重新下载h5工具");
}


function log(msg: string, color?: string) {
    if (txtLog) {
        msg = msg.replace(/\r\n|\n/g, "<br/>");
        if (color) {
            msg = `<font color="${color}">${msg}</font>`;
        }
        let node = document.createElement("div");
        node.innerHTML = `[${new Date().format("HH:mm:ss")}] ${msg}`;
        txtLog.appendChild(node);
    }
}
function getKey(key: string) {
    return Core.project + "_" + key;
}
export const Core = {
    /**
     * pak保存类型
     */
    get pakSaveType() {
        return +(<any>$("#frm")).pakSaveType.value
    },
    get blockType() {
        return +((<any>$("#frm")).parkingType.value) == 0 ? BinPacking : GrowingPacking;
    },
    /**
     * 
     * 
     * 尺寸限制
     * 在IOS10下，自带浏览器和微信下，超过4096*4096像素则显示不了红色方块；
        HUAWEI NXT-TL00手机自带浏览器和UC浏览器下，不能超过8192*8192像素；
        在PC,CHROME浏览器，360浏览器，不能超过16384*16384像素；
      搜狗浏览器，要比16384*16384稍微小一些；
      firefox,最大数在11164*11164左右；
      IE11、EDGE浏览器，没找到极限，只不过越大电脑越慢内存消耗严重；
     * 来源： http://blog.csdn.net/dodott/article/details/54603556
     * 
     * 保险起见，最大只检查到4096的大小  
     * 微信小游戏的最大纹理宽高位 2048，现在将大小减小到2048
     */
    get sizeLimit() {
        return 2048;
    },
    get imageCanScale() {
        return canResize;
    },
    DEBUG: false,
    get imageScale() {
        return canResize ? +(<HTMLInputElement>$("#scale")).value : 1;
    },
    /**
     * 是否使用pngquant
     */
    get usePngquant() {
        return (<HTMLInputElement>$("#usePngquant")).checked;
    },
    /**
     * 是否使用裁剪后的图片作为中心
     */
    get useCrop() {
        return ($("#useCrop") as HTMLInputElement).checked;
    },
    /**
     * 使用pngquant的参数
     */
    get pngquantArgs() {
        let str = (<HTMLInputElement>$("#pngquantArgs")).value;
        return str ? str.split(" ") : undefined;
    },
    get defaultFrameTime() {
        return +(<HTMLInputElement>$("#frameTime")).value;
    },
    /**
     * 获取总进度
     */
    get totalProgress() {
        return _total;
    },
    /**
     * 获取进度条
     */
    get progress() {
        return _progress;
    },
    /**
     * 当没有设置输出文件夹时，使用.out在当前文件夹生成输出资源  
     * 遍历文件夹的时候，排除此文件夹
     */
    get defaultOut() {
        return ".out";
    },
    getCookie(key: string) {
        return cookie.getCookie(getKey(key));
    },
    setCookie(key: string, value: string) {
        cookie.setCookie(getKey(key), value);
    },
    delCookie(key) {
        cookie.delCookie(getKey(key));
    },
    /**
     * 项目名称
     */
    get project() {
        return _project
    },
    get mode(): Mode {
        return +((<any>$("#frm")).mode.value);
    },
    /**
     * 获取透明度阈值
     */
    get alpha(): number {
        return +(<HTMLInputElement>$("#txtAlpha")).value;
    },
    /**
     * 默认取名规则
     */
    get defaultNameRep() { return "{a}{d}" },
    /**
     * 获取取名规则
     */
    get nameRep() {
        return (<HTMLInputElement>$("#txtName")).value;
    },
    /**
     * 获取输出路径
     */
    get outpath() {
        return (<HTMLInputElement>$("#txtOut")).value;
    },
    error(msg: string, err?: Error) {
        let errMsg = "";
        if (err) {
            errMsg = `
<font color="#f00"><b>err:</b></font>
${err.message}
<font color="#f00"><b>stack:</b></font>
${err.stack}`
        }
        log(`<font color="#f00">${msg}</font>${errMsg}`);
    },
    log
};