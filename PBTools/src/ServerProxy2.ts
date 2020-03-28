import Progress from "./Progress";
import CookieForPath from "./CookieForPath";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import { postHttpData } from "./getHttpData";
import { getJavaPageData } from "./getPageProto";
import { git, checkCmdIsOK } from "./exec";
import { analyseUrl, updateWithGit, checkIndexPage } from "./gitlabHelper";
import { progress, getTempPath } from "./Helper";

/**
 * 远程路径
 */
let sPath: string;

//使用git拉取gitlab wiki数据，进行生成
export default class ServerProxy {


    async request(cookieForPath: CookieForPath) {
        progress.reset();
        if (!await this.preCheck(cookieForPath)) {
            return
        }
        if (!checkCmdIsOK("git", ["--version"])) {
            return alert("请先安装git");
        }

        let wikiUrl = decodeURIComponent(cookieForPath.setPathCookie("txtServerWiki", false, false));
        //检查项目下临时git目录
        //解析地址，得到git路径和索引页内容
        const { page, gitUrl, project } = analyseUrl(wikiUrl);
        const path: typeof _path = nodeRequire("path");
        let dist = path.join(getTempPath(), Const.GitTempPath, project);
        await updateWithGit(dist, gitUrl);
        //开始检查文件
        const pageDict = await checkIndexPage(dist, page);
        if (pageDict) {
            const linkDict: { [index: string]: Page } = {};
            for (let name in pageDict) {
                const proto = pageDict[name];
                let page = getJavaPageData(proto, name);
                linkDict[page.name] = page;
            }
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
        progress.addTask();
        let cnt = await postHttpData(sPath, linkDict);
        if (cnt) {
            let result: ServerReturn;
            try {
                result = JSON.parse(cnt);
            } catch (e) {
                throw Error(`服务端解析服务，返回数据有误，返回内容：${cnt}`);
            }
            progress.endTask();
            return result;
        }
    }

}
