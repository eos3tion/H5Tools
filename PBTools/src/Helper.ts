import Progress from "./Progress.js";
import * as _electron from "electron";

export const $g = (id: string) => document.getElementById(id);
const clipboard = nodeRequire('electron').clipboard;
const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");
const electron: typeof _electron = nodeRequire("electron");

/**
 * 输出错误
 */
export function error(msg: string | Error, err?: Error) {
    if (typeof msg !== "string") {
        err = msg;
        msg = "";
    }
    let errMsg = "";
    if (err) {
        errMsg = `
<font color="#f00"><b>err:</b></font>
${err.message}
<font color="#f00"><b>stack:</b></font>
${err.stack}`
    }
    log(`<font color="#f00">${msg}</font>${errMsg}`);
    console.error(msg, err);
}


/**
 * 输出日志
 */
export function log(msg: string, color?: string) {
    let txtLog = $g("txtLog");
    if (txtLog) {
        txtLog.innerHTML += color ? `[${new Date().format("HH:mm:ss")}]<font color="${color}">${msg}</font><br/>` : `${msg}<br/>`;
        txtLog.scrollIntoView(false);
    }
}

/**
 * 创建一个代码区
 * 
 * @private
 * @param {HTMLElement} parent (description)
 * @param {string} filename (description)
 * @param {number} idx (description)
 * @param {string} ccode (description)
 * @param {string} scode (description)
 */
export function createContent(parentID: string, filename: string, idx: number, ccode: string, scode: string = "") {
    let parent = $g(parentID)
    let pane = document.createElement("div");
    pane.style.border = "#000 solid 1px";
    let idCopyClient = "btnCopyClient" + idx;
    let idCopyServer = "btnCopyServer" + idx;
    let template = `<div>${filename}</div>
    <div style="width:100%;float:left;background:#eef">
        客户端代码：<input type="button" value="复制客户端代码" id="${idCopyClient}" />
        <pre style="width:100%;border:#ccf solid 1px;background:#000;color:#fff;font:'Microsoft Yahei'"><code>${hljs.highlightAuto(ccode, ["typescript"]).value}</code></pre>
    </div>`
    pane.innerHTML = template;
    parent.appendChild(pane);
    $g(idCopyClient).addEventListener("click", e => {
        clipboard.writeText(ccode);
    });
}


export function writeFile(fname: string, directory: string, data: string, otherCheck?: { (originContent: string, content: string): boolean }): string {
    let outpath = path.join(directory, fname);
    try {
        // 检查是否有原始文件，检查文件的原始内容和去除了下面信息之后的内容是否相同
        /**
         * 使用JunyouProtoTools，从 ${path} 生成
         * 生成时间 ${createTime}
         **/
        if (fs.existsSync(outpath)) {//有原始文件
            let originContent = fs.readFileSync(outpath, "utf8");
            if (minifyCode(originContent) == minifyCode(data)) {
                if (!otherCheck || otherCheck(originContent, data)) {
                    return `和${outpath}内容相同，无需生成`;
                }
            }
        }

        FsExtra.writeFileSync(outpath, data, true);
    } catch (e) {
        error(`写入文件时失败，路径："${directory}"，文件名："${fname}"`, e);
        return null;
    }
    return outpath;
}

export function getTempPath() {
    const app = electron.remote.app;
    if (process.platform === "win32") {
        return path.join(app.getAppPath(), Const.BasePath);
    } else {
        return path.join(app.getPath("temp"), Const.BasePath);
    }
}

export function getDataPath(url: string) {
    const app = electron.remote.app;
    if (process.platform === "win32") {
        return path.join(app.getAppPath(), url);
    } else {
        return path.join(app.getPath("appData"), url);
    }
}

export const progress = new Progress()
progress.bindProgress($g("progress") as HTMLProgressElement).bindLabel($g("lblProgress"))


export const CmdSuffix = function () {
    let c2sType: string;
    let s2cType: string;


    function setCSType() {
        let value = (document.querySelector("input[name=c2sradio]:checked") as HTMLInputElement).value;
        let arr = value.split("#");
        c2sType = arr[0];
        s2cType = arr[1];
    }
    setCSType();

    document.querySelectorAll("input[name=c2sradio]").forEach(radio => {
        radio.addEventListener("change", setCSType)
    })
    return {
        get c2s() {
            return c2sType;
        },
        get s2c() {
            return s2cType;
        }
    }
}()
