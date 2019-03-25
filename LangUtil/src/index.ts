import { ExcelParser } from "./dbparser/ExcelParser";
import $settings from "./settings/settings";

const path = nodeRequire("path") as typeof import("path");
const fs = nodeRequire("fs") as typeof import("fs");
const DBRef: { new(): DataBaseParser } = ExcelParser;
const Project = "LangUtils_";
/**
 * 消息文件的文件名
 */
const MsgFile = "msg";

var $g: any = (id) => { return document.getElementById(id) };
var $v: any = (id) => $g(id).value;
var currentSetting: Setting;
/**
 * 输出日志
 */
function log(msg: string, color?: string) {
    let txtLog = $g("txtLog");
    if (txtLog) {
        txtLog.innerHTML += color ? `<font color="${color}">${msg}</font><br/>` : `${msg}<br/>`;
    }
}

/**
 * 输出错误
 */
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
    console.error(msg, err);
}

window["Logger"] = {
    log,
    error
}


function getCookie(id: string) {
    let sPath = cookie.getCookie(Project + id);
    if (sPath) {
        $g(id).value = sPath;
    }
}

const enum SetCookieCheckType {
    None = 0,
    CheckExists = 1,
    CheckDir = 0b11,
    CheckDirMask = 0b10
}

function setCookie(id: string, check = SetCookieCheckType.None): string {
    let v: string = $v(id);
    v = v.trim();
    $g(id).value = v;
    if (v) {
        let flag = true;
        let checkExists = check & SetCookieCheckType.CheckExists;
        flag = !checkExists || fs.existsSync(v);
        if (!flag) {
            return;
        }
        let checkDir = check & SetCookieCheckType.CheckDirMask;
        flag = !checkDir || fs.statSync(v).isDirectory();
        if (flag) {
            cookie.setCookie(Project + id, v);
            return v;
        }
    }
}


ready(() => {
    getCookie("txtUrl");
    getCookie("txtRoot");
    getCookie("txtExt");
    $g("chkStringCode").checked = cookie.getCookie(Project + "chkStringCode") == true;
    let sel = $g("solutions") as HTMLSelectElement;
    function setSel(index: number) {
        let opt = sel.options[index];
        if (opt) {
            let setting = $settings[opt.value] as Setting;
            if (setting) {
                $g("txtExt").value = setting.ext;
                $g("txtModReg").value = setting.modReg;
                $g("txtFilterStr").value = setting.filterStr;
                $g("txtIHead").value = setting.iHead;
                $g("txtIMsg").value = setting.iMsg;
                $g("txtIRest").value = setting.iRest;
                $g("txtTemplateHandler").value = setting.templateHandler.toString();
            }
            currentSetting = setting;
        }
    }
    for (let key in $settings) {
        sel.add(new Option(key, key));
    }
    sel.addEventListener("change", (ev) => {
        setSel(sel.selectedIndex);
    });
    let idx = cookie.getCookie(Project + "Solution") || 0;
    sel.selectedIndex = idx;
    setSel(idx);
    window.addEventListener("dragover", e => {
        e.preventDefault();
        return false;
    });

    window.addEventListener("drop", e => {
        e.preventDefault();
        cookie.setCookie(Project + "Solution", sel.selectedIndex);
        cookie.setCookie(Project + "chkStringCode", $g("chkStringCode").checked)
        start(e.dataTransfer.files);
        return false;
    });
    $g("btnGenCodeConst").addEventListener("click", async () => {
        cookie.setCookie(Project + "chkStringCode", $g("chkStringCode").checked);
        //设置cookies
        let root = setCookie("txtRoot", SetCookieCheckType.CheckDir);
        if (!root) {
            alert("没有文件根目录！");
            $g("txtRoot").focus();
            return;
        }
        //配置db源
        let db = new DBRef();
        let dbUrl = setCookie("txtUrl", SetCookieCheckType.CheckExists);
        if (!dbUrl) {
            alert("没有数据源文件的路径！");
            $g("txtUrl").focus();
            return;
        }
        //读取db源
        let source = await db.getData(dbUrl);
        if (!source) {
            return;
        }
        genCodeConst(source, root)
    });
})

async function start(files: FileList) {

    //配置db源
    let db = new DBRef();
    let dbUrl = setCookie("txtUrl", SetCookieCheckType.CheckExists);
    if (!dbUrl) {
        alert("没有存储文件的路径！");
        $g("txtUrl").focus();
        return;
    }
    let sameCodeOpt = +(document.querySelector("[name=chkUseSameCode]:checked") as HTMLInputElement).value;

    //设置cookies
    let root = setCookie("txtRoot", SetCookieCheckType.CheckDir);
    let ext = setCookie("txtExt");
    if (!ext) {
        alert("没有配置扩展名！");
        $g("txtExt").focus();
        return;
    }

    //读取db源
    let source = await db.getData(dbUrl);
    if (!source) {
        return;
    }
    //预处理数据源，得到最大可用的自增code值
    let maxCode = 0;
    source.forEach(dm => {
        for (let i = 0, len = dm.length; i < len; i++) {
            let item = dm[i];
            if (item) {
                let code = ~~item.code;
                if (code > maxCode) {
                    maxCode = code;
                }
            }
        }
    });


    //没有配置根目录
    root = root || "";
    let unsovled = [];
    let unCheckedDir = [] as string[];

    let modDict = {} as { [index: string]: string };

    //检查拖入的文件，和根目录关系，得到模块数据
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let p = file.path;
        let dir = path.dirname(p);
        unCheckedDir.pushOnce(dir);
        unsovled.push(p);
    }

    unCheckedDir.forEach(fp => {
        //找到上级模块
        let relative = path.relative(root, fp);
        if (relative == fp) {
            Logger.error(`拖入的文件${fp}不在根目录${root}或者其子目录下`);
            return
        }
        let seps = relative.split(path.sep);
        let p = root;
        let lMod: string;
        for (let i = 0, len = seps.length; i < len; i++) {
            let cMod = modDict[p];
            if (!cMod) {
                let mFile = path.join(p, MsgFile);
                if (fs.existsSync(mFile)) {
                    cMod = fs.readFileSync(mFile, "utf8");
                }
            }
            if (!cMod) {
                cMod = lMod;
            }
            modDict[p] = cMod;
            lMod = cMod;
            let d = seps[i];
            p = path.join(p, d);
        }
    });

    let fileItems = [] as { path: string, module: string }[];
    while (unsovled.length) {
        let fp = unsovled.pop();
        let sta = fs.statSync(fp);
        if (sta.isDirectory()) {
            let list = fs.readdirSync(fp);
            let mod: string;
            for (let i = 0; i < list.length; i++) {
                let file = list[i];
                let pp = path.join(fp, file);
                if (file == MsgFile) {
                    //读取模块数据
                    mod = fs.readFileSync(pp, "utf8");
                } else {
                    unsovled.push(pp);
                }
            }
            if (!mod) {//向上级文件夹查找，检查是否有mod数据
                let p = fp;
                while (true) {
                    let np = path.dirname(p);
                    if (np == p || np == ".") {
                        break;
                    }
                    p = np;
                    mod = modDict[p];
                    if (mod) {
                        break;
                    }
                }
            }
            modDict[fp] = mod;
        } else {
            let par = path.parse(fp);
            if (par.ext == ext) {
                let dir = par.dir;
                let module = modDict[dir];
                fileItems.push({ path: fp, module });
            }
        }
    }

    let sourceFiles = [] as SourceFile[];
    //检查文件列表
    let filterstr = $v("txtFilterStr");
    let iHead = $v("txtIHead");
    let iMsg = $v("txtIMsg");
    let iRest = $v("txtIRest");
    let regIdxes = { iHead, iMsg, iRest, code: maxCode };
    let modRegExp = new RegExp($v("txtModReg"));
    fileItems.forEach(item => {
        let filePath = item.path;
        /**项目相对路径 */
        let key = path.relative(root, filePath);
        let content = fs.readFileSync(filePath, "utf8");
        //检查文件内容，是否有文件模块
        modRegExp.lastIndex = 0;
        let ret = modRegExp.exec(content);
        let module = item.module;
        if (ret) {
            module = ret[1];
        }
        let file = <SourceFile>{};
        file.module = module;
        file.path = filePath;
        file.relative = key;
        file.raw = content;
        file.items = [];
        let all: RepItem[] = [];
        file.all = all;
        if (content) {
            getItem(content, filterstr, regIdxes, file, all);
        }
        if (all.length) {
            sourceFiles.push(file);
        }
    });
    if (!sourceFiles.length) {
        Logger.log(`文件中没有任何需要提取的code`);
        return;
    }
    //处理文件
    alert("请先提交代码，防止中间出现错误后，但文件已经变更");
    let templateHandler = eval($v("txtTemplateHandler")) as { (msg: string, node: RepItem): string };
    //开始处理文件
    sourceFiles.forEach(sourceFile => {
        let content = getContent(sourceFile, sourceFile.raw, templateHandler, currentSetting.constCfg, source)
        fs.writeFileSync(sourceFile.path, content);
        Logger.log("成功替换并保存代码：" + sourceFile.path);
    });

    source.forEach(dm => {
        //对source进行排序
        dm.sort((b, a) => {
            let ac = +a.code;
            let bc = +b.code;
            let tac = ac == a.code;
            let tbc = bc == b.code;
            if (!tac && tbc) {
                return 1;
            } else if (tac && !tbc) {
                return -1;
            } else if (!tac && !tbc) {
                if (tac > tbc) {
                    return 1;
                } else if (tac < tbc) {
                    return -1;
                }
            } else {// code都是数字
                return bc - ac;//模块按输入序列
                // let tam = a.module;
                // let tbm = b.module;
                // if (tam && !tbm) {
                //     return 1;
                // } else if (!tam && tbm) {
                //     return -1;
                // } else if (tam && tbm) {
                //     if (tam > tbm) {
                //         return 1;
                //     } else if (tam < tbm) {
                //         return -1;
                //     } else {
                //         return bc - ac;
                //     }
                // } else {
                //     return bc - ac;
                // }
            }
        });
    });
    db.setData(dbUrl, source);

    //生成Const文件
    genCodeConst(source, root);

    alert("处理完成");
}

function genCodeConst(source: Map<string, DataModule>, root?: string) {
    if (!root) {
        return;
    }
    let genStringCode = $g("chkStringCode").checked;
    let constCfg = currentSetting.constCfg;
    if (constCfg) {
        let { head, main, tail, file } = constCfg;
        let content = head.join("\n") + "\n";
        let mainStr = main.join("\n");
        source.forEach(datas => {
            for (let i = 0; i < datas.length; i++) {
                let data = datas[i];
                let { code, msg } = data;
                if (code != +code) {
                    if (genStringCode) {
                        let codeValue = `"${code}"`;
                        content += mainStr.substitute({ code: constCfg.getCode(code), msg, codeValue }) + "\n";
                    }
                } else {
                    content += mainStr.substitute({ code: constCfg.getCode(code), msg, codeValue: code }) + "\n";
                }
            }
        });
        content += tail.join("\n");

        let filePath = path.join(root, file);
        //存储文件
        fs.writeFileSync(filePath, content);
    }
}


function getContent(node: Node, raw: string, templateHandler: { (msg: string, node: RepItem): string }, constCfg: SettingConstConfig, map: Map<string, DataModule>) {
    let content = "";
    let start = 0;
    let module = node.module;
    let source = map.get(module);
    if (!source) {
        source = [] as DataModule;
        source.module = module;
        map.set(module, source);
    }
    node.items.forEach(child => {
        const { pos, end } = child;
        if (pos > start) {
            content += raw.substring(start, pos);
        }
        let children = child.items;
        source.push(child);
        const code = child.code;
        let msg = constCfg && constCfg.getKey(code) || code;
        content += templateHandler(msg + (children ? getContent(child, child.rest, templateHandler, constCfg, map) : ""), child);
        start = end;
    })
    content += raw.substring(start);
    return content;
}

function getItem(content: string, filterstr: string, opt: SouceFileOpt, parent: Node, all: RepItem[]) {
    let items = parent.items;
    let reg = new RegExp(filterstr, "g");
    const { iHead, iMsg, iRest } = opt;
    while (true) {
        let o = reg.exec(content);
        if (o) {
            let msg = o[iMsg];
            let pos = o.index;
            let raw = o[0];
            let end = pos + raw.length;
            let item: RepItem = <RepItem>{};
            items.push(item);
            all.push(item);
            item.pos = pos;
            item.end = end;
            item.path = parent.path;
            item.raw = raw;
            let rest = o[iRest];
            item.head = o[iHead];
            item.msg = msg.replace(/\\r/g, "\r").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
            item.module = parent.module;
            item.code = ++opt.code;
            if (rest) {
                item.items = [];
                item.rest = rest;
                getItem(rest, filterstr, opt, item, all);
            }
        } else {
            break;
        }
    }
}