import Progress from "./Progress";
import CookieForPath from "./CookieForPath";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import { postHttpData } from "./getHttpData";
import { getJavaPageData } from "./getPageProto";
import { git, checkCmdIsOK } from "./exec";
const enum Const {

    BasePath = "pbtool",
    GitTempPath = "gittmp",

    MarkDownExt = ".md",

}

/**
 * 远程路径
 */
let sPath: string;

//使用git拉取gitlab wiki数据，进行生成
export default class ServerProxy {
    protected _progress: Progress;
    /**
     * app的基本路径
     */
    protected _appTmpPath: string;
    constructor() {
        this._progress = new Progress().bindProgress(document.querySelector("#progress") as HTMLProgressElement).bindLabel(document.querySelector("#lblProgress"));
        const electron: typeof _electron = nodeRequire("electron");
        const path: typeof _path = nodeRequire("path");
        this._appTmpPath = path.join(electron.remote.app.getAppPath(), Const.BasePath);
    }

    async request(cookieForPath: CookieForPath) {
        this._progress.reset();
        if (!await this.preCheck(cookieForPath)) {
            return
        }
        if (!checkCmdIsOK("git", ["--version"])) {
            return alert("请先安装git，'\\\\192.168.0.5\\前端工具共享'可以找到git安装程序");
        }

        let wikiUrl = decodeURIComponent(cookieForPath.setPathCookie("txtServerWiki", false, false));
        //检查项目下临时git目录
        //解析地址，得到git路径和索引页内容
        //http://192.168.0.205:1234/h5arpg/hch5/wikis/%E5%89%8D%E5%90%8E%E7%AB%AF%E9%80%9A%E4%BF%A1
        //只处理 gitlab 地址
        let protocalIndex = wikiUrl.indexOf("//");
        let p = protocalIndex > -1 ? wikiUrl.substr(protocalIndex + 2) : wikiUrl;
        let paths = p.split("/");
        //最后4个数据
        // git地址
        // http://192.168.0.205:1234/h5arpg/hch5.wiki.git
        let len = paths.length;
        //页面名称，对应 文件 %E5%89%8D%E5%90%8E%E7%AB%AF%E9%80%9A%E4%BF%A1.md
        let page = paths[len - 1];
        let gitUrl = wikiUrl.substring(0, protocalIndex + 2) + paths.slice(0, len - 2).join("/") + ".wiki.git";
        const path: typeof _path = nodeRequire("path");
        const fs: typeof _fs = nodeRequire("fs");
        let dist = path.join(this._appTmpPath, Const.GitTempPath, paths[len - 3]);
        if (!fs.existsSync(dist)) {
            FsExtra.mkdirs(dist);
        }
        let dotGit = path.join(dist, ".git");
        const _progress = this._progress;
        _progress.addTask();
        window.log(`正在拉取项目${dist}`);
        if (fs.existsSync(dotGit) && fs.statSync(dotGit).isDirectory()) {
            await git("reset", dist, "--hard");
            await git("clean", dist, "-df");
            //同步项目
            await git("fetch", dist);
        } else {
            //clone项目，并拉项目至指定路径
            await git("clone", null, gitUrl, dist);
        }
        //切换到指定的版本
        await git("checkout", dist, "master");
        await git("pull", dist, "origin");
        _progress.endTask();
        //开始检查文件
        let indexMD = path.join(dist, page + ".md");
        let linkDict: { [index: string]: Page } = {};
        if (fs.existsSync(indexMD)) {
            window.log(`开始解析文件${indexMD}`);
            _progress.addTask();
            //检查索引文件            
            let content = fs.readFileSync(indexMD, "utf8");
            //[通用对象](DTO对象)
            let reg = /\[[^\]]+?\]\s*?\(([^)]+?)\)/g;
            while (true) {
                let ret = reg.exec(content);
                if (ret) {
                    let [, name] = ret;
                    this.getProto(dist, linkDict, name);
                } else {
                    break;
                }
            }
            _progress.endTask();
            return this.sovleData(linkDict);
        }
    }

    protected async preCheck(cookieForPath: CookieForPath) {
        sPath = cookieForPath.setPathCookie("txtServerHttp", false, false);
        if (!sPath) {
            return alert("解析服务的地址不能为空");
        }
        return true;
    }

    /**
     * 处理页面数据
     * @param cookieForPath 
     * @param linkDict 
     */
    protected async sovleData(linkDict: { [index: string]: Page }) {
        this._progress.addTask();
        let cnt = await postHttpData(sPath, linkDict);
        if (cnt) {
            let result: ServerReturn;
            try {
                result = JSON.parse(cnt);
            } catch (e) {
                throw Error(`服务端解析服务，返回数据有误，返回内容：${cnt}`);
            }
            this._progress.endTask();
            return result;
        }
    }

    private getProto(basePath: string, linkDict: { [index: string]: Page }, name: string) {
        const path: typeof _path = nodeRequire("path");
        const fs: typeof _fs = nodeRequire("fs");
        let file = path.join(basePath, name + Const.MarkDownExt);
        if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, "utf8");
            let reg = /```\s*protobuf([^]*?)```/mg;
            let proto = "";
            while (true) {
                let result = reg.exec(content);
                if (result) {
                    proto += result[1] + "\n";
                } else {
                    break;
                }
            }
            if (proto) {
                let page = getJavaPageData(proto, name);
                linkDict[page.name] = page;
                this._progress.endTask();
            }
        }
    }
}
