import { git, checkCmdIsOK } from "./exec";
import * as _path from "path";
import * as _fs from "fs";
import { log, progress, getTempPath } from "./Helper";
import { getPageData } from "./getPageProto";
const path: typeof _path = nodeRequire("path");
const fs: typeof _fs = nodeRequire("fs");
/**
 * 分析 gitlab 的页面路径
 * @param wikiUrl gitlab，要找的页面 
 */
export function analyseUrl(wikiUrl: string) {
    //http://192.168.0.205:1234/h5arpg/hch5/wikis/%E5%89%8D%E5%90%8E%E7%AB%AF%E9%80%9A%E4%BF%A1
    //只处理 gitlab 地址
    wikiUrl = decodeURIComponent(wikiUrl);
    let protocalIndex = wikiUrl.indexOf("//");
    let p = protocalIndex > -1 ? wikiUrl.substr(protocalIndex + 2) : wikiUrl;
    let paths = p.split("/");
    let protocal = protocalIndex > -1 ? wikiUrl.substring(0, protocalIndex + 2) : "";
    //最后4个数据
    // git地址
    // http://192.168.0.205:1234/h5arpg/hch5.wiki.git
    let len = paths.length;
    //页面名称，对应 文件 %E5%89%8D%E5%90%8E%E7%AB%AF%E9%80%9A%E4%BF%A1.md
    let page = paths[len - 1];
    let gitUrl = wikiUrl.substring(0, protocalIndex + 2) + paths.slice(0, len - 2).join("/") + ".wiki.git";
    let project = paths[len - 3];
    let group = paths[len - 4];
    return { page, gitUrl, project, group, baseWikiUrl: protocal + paths.slice(0, len - 1).join("/") }
}
/**
 * 检查是否能正常执行git
 */
export function checkGitIsOK() {
    let flag = checkCmdIsOK("git", ["--version"]);
    if (!flag) {
        alert("请先安装git");
    }
    return flag;
}

/**
 * 使用git更新项目
 * @param dist      项目地址
 * @param gitUrl    git地址
 * @param branch    分支名称，默认`master`
 */
export async function updateWithGit(dist: string, gitUrl: string, branch = "master") {
    if (!fs.existsSync(dist)) {
        FsExtra.mkdirs(dist);
    }
    progress.addTask();
    log(`正在拉取项目${dist}`);
    let dotGit = path.join(dist, ".git");
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
    await git("checkout", dist, branch);
    await git("pull", dist, "origin");
    progress.endTask();
}

/**
 * 从`md`文件中提取protobuf
 * @param basePath 基础路径
 * @param name 文件名称
 */
export function getProtoFromMD(basePath: string, name: string) {
    let file = path.join(basePath, name + Const.MarkDownExt);
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, "utf8");
        let rawContent = content;
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
        return { proto, rawContent, path: file };
    }
}

/**
 * 检查索引页面
 * @param dist 
 * @param page 
 */
export async function checkIndexPage(dist: string, page: string) {
    //开始检查文件
    let indexMD = path.join(dist, page + ".md");
    let linkDict: { [index: string]: GetMDResult } = {};
    if (fs.existsSync(indexMD)) {
        log(`开始解析文件${indexMD}`);
        progress.addTask();
        //检查索引文件            
        let content = fs.readFileSync(indexMD, "utf8");
        //[通用对象](DTO对象)
        let reg = /\[[^\]]+?\]\s*?\(([^)]+?)\)/g;
        while (true) {
            let ret = reg.exec(content);
            if (ret) {
                let [, name] = ret;
                progress.addTask();
                let result = await getProtoFromMD(dist, name);
                if (result) {
                    linkDict[name] = result;
                }
                progress.endTask();
            } else {
                break;
            }
        }
        progress.endTask();
        return linkDict;
    }
}

export function getDist(project: string) {
    return path.join(getTempPath(), Const.GitTempPath, project);
}

/**
 * 分析索引页面
 * @param indexUrl 索引页面地址
 */
export async function analyseIndex(indexUrl: string) {
    if (!indexUrl) {
        alert(`索引页地址不能为空`);
        return null
    }

    if (!checkGitIsOK()) {
        return null
    }
    const urlResult = analyseUrl(indexUrl);
    const { page, gitUrl, project } = urlResult;
    let dist = getDist(project);
    await updateWithGit(dist, gitUrl);
    //开始检查文件
    const pageDict = await checkIndexPage(dist, page);
    const globalRefs = {} as ProtoRefDict;
    if (pageDict) {
        const pages: { [index: string]: Page } = {};
        for (let name in pageDict) {
            const { proto, rawContent, path } = pageDict[name];
            let page = getPageData(proto, name);
            page.rawContent = rawContent;
            page.path = path;
            pages[page.name] = page;

            let refs = page.refs;
            if (refs) {
                for (let refName in refs) {
                    const ref = refs[refName];
                    let tester = globalRefs[refName];
                    if (tester) {
                        throw Error(`页面[${tester.page.rawName}]和[${page.rawName}]出现了相同的message名称[${refName}]`)
                    }
                    globalRefs[refName] = ref;
                }
            }
        }
        return { pages, globalRefs, urlResult };
    }
}

export async function commitGitToOrigin(dist: string, pages: string[], message: string) {
    await git("add", dist, ...pages);
    await git("commit", dist, "-m", message);
    await git("push", dist, "origin");
}


type PromiseFunction<T> = T extends (...args: any) => Promise<infer U> ? U : T;

export type IndexResult = PromiseFunction<typeof analyseIndex>;

type GetMDResult = ReturnType<typeof getProtoFromMD>;
