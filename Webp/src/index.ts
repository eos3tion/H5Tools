import { Progress } from "./Progress";
import _fs = require("fs");
import _path = require("path");
import { resolve } from "url";

const $: typeof document.querySelector = document.querySelector.bind(document);
const txtLog = $("#txtLog") as HTMLDivElement;
const txtQuality = $("#txtQuality") as HTMLInputElement;
const _progress = new Progress().bindProgress($("#progress") as HTMLProgressElement).bindLabel($("#lblProgress"));
const $canvas = document.createElement("canvas");
const $ctx = $canvas.getContext("2d");
const $image = document.createElement("img");


window.addEventListener("dragover", e => {
    e.preventDefault();
});
window.addEventListener("drop", async (e) => {
    e.preventDefault();
    try {
        let files = e.dataTransfer.files;
        let paths: string[] = [];
        for (let i = 0; i < files.length; i++) {
            paths.push(files[i].path);
        }
        // 检查文件是否为文件夹
        let fs: typeof _fs = nodeRequire("fs");
        let path: typeof _path = nodeRequire("path");
        _progress.reset();
        let arr: string[] = [];
        for (let i = 0; i < paths.length; i++) {
            let p = paths[i];
            let ret = path.parse(p);
            let sta = fs.statSync(p);
            if (fs.statSync(p).isDirectory()) {
                let list = fs.readdirSync(p);
                for (let j = 0; j < list.length; j++) {
                    paths.push(path.join(p, list[j]));
                }
            } else {
                if (ret.ext == ".png" || ret.ext == ".jpg") {
                    arr.push(p);
                }
            }
        }
        let quality = +txtQuality.value;
        for (let i = 0; i < arr.length; i++) {
            let p = arr[i];
            let webp = p + ".webp";
            if (!fs.existsSync(webp)) {
                await drawImage(p, webp, quality);
            }
        }
    } catch (e) {
        alert(e.message);
        error("", e);
    }
});

function drawImage(input: string, out: string, quality: number) {
    return new Promise((resolve, reject) => {
        const electron = nodeRequire("electron") as typeof import("electron");
        let image = electron.nativeImage.createFromPath(input);
        $image.src = image.toDataURL();
        $image.onload = function () {
            const { width, height } = image.getSize();
            $canvas.width = width;
            $canvas.height = height;
            $ctx.drawImage($image, 0, 0, width, height);
            let dataUrl = $canvas.toDataURL("image/webp", quality).slice(23);
            let fs = nodeRequire("fs") as typeof import("fs");
            fs.writeFileSync(out, new Buffer(dataUrl, "base64"));
            log(`图片生成成功：${out}`, "#0f0");
            resolve();
        }
        $image.onerror = reject;
    })
}


function error(msg: string, err?: Error) {
    let errMsg = "";
    if (err) {
        errMsg = `
<font color="#f00"><b>err:</b></font>
${err.message}
<font color="#f00"><b>stack:</b></font>
${err.stack}`
    }
    log(`<font color="#f00">${msg}</font>${errMsg}`);
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