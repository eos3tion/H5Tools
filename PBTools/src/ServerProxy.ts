
import CookieForPath from "CookieForPath";
import { getHttpData, postHttpData, GetHttpDataCallback } from "getHttpData";
import getPageProto, { getJavaPageData } from "getPageProto";
import Progress from "Progress";
import "Const";
import "../lib/hanzi2pinyin";
import _url = require("url");

/**
 * 用于代理服务器解析服务
 * 
 * @class ServerProxy
 */
export default class ServerProxy {
    private _progress: Progress;
    constructor() {
        this._progress = new Progress().bindProgress(document.querySelector("#progress") as HTMLProgressElement).bindLabel(document.querySelector("#lblProgress"));
    }
    async request(cookieForPath: CookieForPath) {
        let sPath = cookieForPath.setPathCookie("txtServerHttp", false, false);
        let wikiUrl = cookieForPath.setPathCookie("txtServerWiki", false, false);
        if (!sPath) {
            alert("解析服务的地址不能为空");
            return;
        }

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

        let linkDict: { [index: string]: Page } = {};

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
                arrRet.push(this.getProto(link, linkDict, name));
            } else {
                break;
            }
        }

        await Promise.all(arrRet);
        console.log(linkDict);

        let content = await postHttpData(sPath, linkDict);
        if (content) {
            let result: ServerReturn;
            try {
                result = JSON.parse(content);
            } catch (e) {
                throw Error(`服务端解析服务，返回数据有误，返回内容：${content}`);
            }
            return result;
        }
    }



    private async getProto(url: string, linkDict: { [index: string]: Page }, name: string) {
        //尝试加载多次页面
        let ret: GetHttpDataCallback;
        let count = 10;
        do {
            let result = await getHttpData(url);
            if (result && result.res.statusCode == 200) {
                ret = result;
                break;
            }
        } while (count--)
        if (ret) {
            let content = getPageProto(ret.content);
            if (content) {
                let page = getJavaPageData(content, name);
                linkDict[page.name] = page;
                this._progress.endTask();
            }
        } else {
            throw Error(`页面${name}[${url}]没有正常过去到页面数据`);
        }
    }
}