import { FileArray, MapEffRender, MapEffFactory } from "./MapEffDisplay";
import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import { Core } from "../../Core";
import { addRes } from "../../res/Res";

const anis: { [index: string]: jy.AniInfo } = $DD.ani = {};

class AniMapEffRender implements MapEffRender {

    uri: string;
    get display() {
        return this.render.display;
    }
    render: jy.Recyclable<jy.AniRender>;
    create(key: string) {
        this.uri = key;
        let render = jy.AniRender.getAni(key, { start: 100 * Math.random() });
        this.render = render;
        return render.display;
    }
    onRecycle() {
        let render = this.render;
        if (render) {
            this.render = undefined;
            render.recycle();
        }
    }
}

function prepare(key: string, dataPath?: string, imgPath?: string) {
    let ani = anis[key];
    if (!ani) {
        if (!dataPath) {
            dataPath = path.join(Core.basePath, Core.cfg.effectPath, key, ConstString.AniDataFile);
        }
        if (!imgPath) {
            imgPath = path.join(Core.basePath, Core.cfg.effectPath, key, ConstString.AniImageFile);
        }
        if (!fs.existsSync(dataPath)) {
            return alert(`找不到指定的特效配置文件[${dataPath}]`)
        }
        let str = fs.readFileSync(dataPath, "utf8");
        let data;
        try {
            data = JSON.parse(str);
        } catch (e) {
            return alert(`特效配置文件[${dataPath}]有误`);
        }
        ani = new jy.AniInfo();
        ani.init(key, data);
        if (!ani.actionInfo.isCircle) {
            return alert(`特效配置文件不是循环动画，请检查`);
        }
        let filename = path.basename(imgPath);
        addRes(`${jy.ResPrefix.Ani}${key}/${filename}`, imgPath);
        anis[key] = ani;
    }
    return true;
}


function checkAniFile(files: FileArray, parent: string = "") {
    // 必须同时找到
    let goted: { imgPath: string, dataPath: string, key: string } = null;
    let imgPath: string;
    let dataPath: string;
    // 遍历文件，检查文件是否匹配
    for (let i = 0, len = files.length; i < len; i++) {
        let file = files[i];
        let p: string;
        if (typeof file === "string") {
            p = path.join(parent, <string>file);
        } else {
            // 检查路径
            p = file["path"];
        }
        let fstats = fs.statSync(p);
        // 如果是文件夹
        if (fstats.isDirectory()) {
            goted = checkAniFile(fs.readdirSync(p), p);
        } else if (fstats.isFile()) {// 检查文件
            let re = path.parse(p);
            if (re.ext == ".png") {
                imgPath = p;
            } else if (re.base == ConstString.AniDataFile) {
                dataPath = p;
            }
            if (imgPath && dataPath) {
                // 得到上级目录
                let key = path.basename(re.dir);
                goted = { imgPath, dataPath, key };
            }
        }
        if (goted) {
            return goted;
        }

    }
}

async function checkAndGetRender(files: FileList) {
    const goted = checkAniFile(files)
    if (goted) {
        const key = goted.key;
        if (prepare(key, goted.dataPath, goted.imgPath)) {
            let render = jy.recyclable(AniMapEffRender);
            render.create(key);
            return render;
        }
    }
}

async function create(eff: MapEffData) {
    let uri = eff.uri;
    prepare(uri)
    let render = jy.recyclable(AniMapEffRender);
    render.create(uri);
    return render;
}

export const AniMapEffFactory = {
    checkAndGetRender,
    create,
    prepare: async function (effData: MapEffData) {
        prepare(effData.uri);
    },
} as MapEffFactory
