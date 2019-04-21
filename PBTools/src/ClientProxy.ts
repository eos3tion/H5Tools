
import CookieForPath from "CookieForPath";
import { getHttpData, postHttpData } from "getHttpData";
import getPageProto from "getPageProto";
import Progress from "Progress";
import "Const";
import "../lib/hanzi2pinyin";
import _url = require("url");
import _proto = require("protobufjs");
import * as _pbjs from "../lib/protobuf";
const pbjs: typeof _proto = _pbjs;

/**
 * 用于代理服务器解析服务
 * 
 * @class ServerProxy
 */
export default class ClientProxy {
    private _progress: Progress;
    constructor() {
        this._progress = new Progress().bindProgress(document.querySelector("#progressClient") as HTMLProgressElement).bindLabel(document.querySelector("#lblProgressClient"));
    }
    async request(cookieForPath: CookieForPath, getProtoFromHttp: { (url: string, gcfg?: ClientCfg): Promise<void> }, gcfg: ClientCfg) {
        let wikiUrl = cookieForPath.setPathCookie("txtServerWiki", false, false);

        const progress = this._progress;
        progress.reset();

        progress.addTask();
        //获取wiki地址上页面内容
        let result = await getHttpData(wikiUrl);
        var reg = /<a href="([^"]*?)">(.*?)<\/a>/g;

        //protobuf定义的页面的地址被包在<div class="wiki">.....</div>之中
        //找到内容起始点
        const wiki = `<div class="wiki">`;
        let cnt = result.content;
        let idx = cnt.search(wiki) + wiki.length;
        let divReg = /<\/?div[^>]*?>/g;
        divReg.lastIndex = idx;

        let start = idx;
        let arr = [true];
        while (true) {
            let ret = divReg.exec(cnt);
            if (ret) {
                let matched = ret[0];
                if (matched[1] == `/`) {//结束标签
                    arr.pop();
                } else {//开始标签
                    arr.push(true);
                }
                if (!arr.length) {
                    break;
                }
            } else {
                break;
            }
        }
        progress.endTask();
        const url: typeof _url = nodeRequire("url");

        let end = divReg.lastIndex;
        reg.lastIndex = start;
        let arrRet = [];
        while (reg.lastIndex < end) {
            let ret = reg.exec(cnt);
            if (ret) {
                //链接地址
                let [, link, name] = ret;
                link = url.resolve(wikiUrl, link);
                progress.addTask();
                arrRet.push(getProtoFromHttp(link, gcfg).then(() => {
                    progress.endTask();
                }));
            } else {
                break;
            }
        }
        await Promise.all(arrRet);
    }
}