import { FilesParser } from "./FilesParser";
import _fs = require("fs");
import _path = require("path");
import { Core } from "./Core";

const mode = ($("#frm") as HTMLFormElement).mode as RadioNodeList;
mode.forEach(input => input.addEventListener("change", function (ev) {
    ($("#pakSavePane") as HTMLDivElement).style.display = +mode.value == Mode.Pak ? "block" : "none";
}))

let txtOut = $("#txtOut") as HTMLInputElement;
txtOut.value = Core.getCookie("out") || "";
function setCookieOut() {
    //存储路径
    let outpath = txtOut.value;
    if (outpath) {
        Core.setCookie("out", outpath);
    } else {
        Core.delCookie("out");
    }
}


let txtScale = $("#scale") as HTMLInputElement;
if (Core.imageCanScale) {
    txtScale.value = Core.getCookie("scale") || 1;
} else {
    txtScale.value = "1";
    txtScale.disabled = true;
}
function setCookieScale() {
    let scale = +txtScale.value;
    if (scale != 1) {
        Core.setCookie("scale", <any>scale);
    } else {
        Core.delCookie("scale");
    }
}

//处理pngquant的参数
let chkPngQuant = $("#usePngquant") as HTMLInputElement;
let txtPngQuantArgs = $("#pngquantArgs") as HTMLInputElement;
chkPngQuant.addEventListener("change", () => {
    if (chkPngQuant.checked) {
        txtPngQuantArgs.disabled = false;
    } else {
        txtPngQuantArgs.disabled = true;
    }
});
chkPngQuant.checked = Core.getCookie("usePngQuant") != 0;
txtPngQuantArgs.value = Core.getCookie("pngquantArgs") || "";
function setCookiePngQuant() {
    let usePngquant = chkPngQuant.checked;
    if (usePngquant) {
        Core.setCookie("usePngQuant", <any>1);
    } else {
        Core.setCookie("usePngQuant", <any>0);
    }
    let args = txtPngQuantArgs.value;
    if (args) {
        Core.setCookie("pngquantArgs", args);
    } else {
        Core.delCookie("pngquantArgs");
    }
}




//处理name
let txtName = $("#txtName") as HTMLInputElement;
let defName = $("#defName") as HTMLInputElement;
defName.addEventListener("change", () => {
    if (defName.checked) {
        txtName.value = Core.defaultNameRep;
        txtName.disabled = true;
    } else {
        txtName.disabled = false;
        txtName.select();
    }
})

var parser: FilesParser;
window.addEventListener("dragover", e => {
    e.preventDefault();
});
window.addEventListener("drop", async (e) => {
    e.preventDefault();
    try {
        //存储cookie
        setCookieOut();
        setCookieScale();
        setCookiePngQuant();

        let t = performance.now();
        let files = e.dataTransfer.files;
        if (!parser) {
            parser = new FilesParser;
        } else {
            parser.stop();
        }

        let dict: { [index: string]: string[] } = {};
        let paths: string[] = [];
        for (let i = 0; i < files.length; i++) {
            paths.push(files[i].path);
        }
        // 检查文件是否为文件夹
        let fs: typeof _fs = nodeRequire("fs");
        let path: typeof _path = nodeRequire("path");
        let defaultOut = Core.defaultOut;
        let totalProgress = Core.totalProgress;
        totalProgress.reset();
        for (let i = 0; i < paths.length; i++) {
            let p = paths[i];
            let ret = path.parse(p);
            if (fs.statSync(p).isDirectory()) {
                if (ret.base == defaultOut) {//默认的输出文件夹
                    continue;
                }
                let list = fs.readdirSync(p);
                for (let j = 0; j < list.length; j++) {
                    paths.push(path.join(p, list[j]));
                }
            } else {
                let dir = ret.dir;
                let arr = dict[dir];
                if (!arr) {
                    dict[dir] = arr = [];
                    totalProgress.addTask();
                }
                arr.push(p);
            }
        }
        for (let key in dict) {
            let paths = dict[key];
            await parser.setDir(key).setPaths(paths).execute();
            totalProgress.endTask();
        }
        Core.log(`全部处理完成，耗时：${performance.now() - t}`, "#f00");
    } catch (e) {
        alert(e.message);
        Core.error("", e);
    }
});