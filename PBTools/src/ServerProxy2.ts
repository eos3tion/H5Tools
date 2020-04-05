import CookieForPath from "./CookieForPath";
import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import { postHttpData } from "./getHttpData";
import { checkGitIsOK, analyseIndex, IndexResult } from "./GitlabHelper";
import { progress } from "./Helper";

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
        if (!checkGitIsOK()) {
            return;
        }

        let wikiUrl = cookieForPath.setPathCookie("txtServerWiki", false, false);
        let result = await analyseIndex(wikiUrl);
        if (result) {
            return this.sovleData(result);
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
    protected async sovleData(result: IndexResult) {
        progress.addTask();
        let cnt = await postHttpData(sPath, result.pages);
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
