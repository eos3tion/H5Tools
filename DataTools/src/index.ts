import * as $XLSX from "xlsx";
declare var XLSX: typeof $XLSX;
const path: typeof import("path") = nodeRequire("path");
const fs: typeof import("fs") = nodeRequire("fs");
const clipboard = nodeRequire('electron').clipboard;
import { PluginErrorType } from "./PluginErrorType.js";
import { writeJSONData, writeAMFData, readAMFData, writeCommonBinData } from "./DataReadWrite.js";
import { TypeCheckers } from "./TypeCheckers.js";
import { genManualAreaCode, getManualCodeInfo, hasManualAreaCode, getRawManualAreaCode } from "./MenualCodeHelper.js";
import ClientRegTemplate from "./ClientRegTemplate.js";
import PluginLoader from "./PluginLoader.js";
import asyncFileLoad from "./asyncFileLoad.js";


hljs.loadLanguage("typescript");
hljs.loadLanguage("java");
/**
 * 附加数据的接口配置文件夹
 */
const Extra = "extra";



/**
 * 正常数据内容，列表数据
 */
const SHEET_MAIN = "导出";
/**
 * 附加数据，用于代替之前公共数据表功能
 * 这样可以将一个模块数据配置在一起
 * 第一列为Key
 * 第二列为Value
 */
const SHEET_EXTRA = "附加数据";

/**
 * 用于配置表的配置  
 * 程序用的一些配置
 */
const SHEET_CONFIG = "程序配置";

var $g: any = (id) => { return document.getElementById(id) };
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

hljs.loadLanguage("typescript");
const cookieKey = "h5JavaExcel_"
/**
 * ExcelDataSaver
 */
export class ExcelDataSaver {
    constructor() {
        ready(() => {
            window.addEventListener("dragover", e => {
                e.preventDefault();
                return false;
            });

            window.addEventListener("drop", e => {
                e.preventDefault();
                this.onDrop(e.dataTransfer.files);
                return false;
            });
            this.getPathCookie("txtClientPath");
            this.getPathCookie("txtServerPath");
            $g("chkClientPath").checked = !!cookie.getCookie(cookieKey + "chkClientPath");
            $g("chkServerPath").checked = !!cookie.getCookie(cookieKey + "chkServerPath");
            $g("chkESModule").checked = !!cookie.getCookie(cookieKey + "chkESModule");
        });
    }

    private getPathCookie(id: string) {
        let sPath = cookie.getCookie(cookieKey + id);
        if (sPath) {
            $g(id).value = sPath;
        }
    }

    private setPathCookie(id: string): string {
        let v: string = $g(id).value;
        v = v.trim();
        $g(id).value = v;
        if (v && fs.existsSync(v)) {
            let re = fs.statSync(v);
            if (re.isDirectory()) {
                cookie.setCookie(cookieKey + id, v)
                return v;
            }
        }
        return undefined;
    }


    private async onDrop(files: FileList) {
        let gcfg: GlobalCfg;
        let cPath = this.setPathCookie("txtClientPath");
        let sPath = this.setPathCookie("txtServerPath");

        let useClientPath = $g("chkClientPath").checked;
        cookie.setCookie(cookieKey + "chkClientPath", useClientPath);
        let useServerPath = $g("chkServerPath").checked;
        cookie.setCookie(cookieKey + "chkServerPath", useServerPath);
        let useESModule = $g("chkESModule").checked;
        cookie.setCookie(cookieKey + "chkESModule", useESModule);

        if (!useClientPath) {
            cPath = "";
        }
        if (!useServerPath) {
            sPath = "";
        }
        // 清理code区
        $g("code").innerHTML = "";
        let unsolved = Array.from(files);
        let cFileNames: Map<string, ConfigKeyBin> = new Map(), sFileNames: Map<string, ConfigKeyBin> = new Map();
        let configKeyInfo = { cFileNames, sFileNames };
        let hasClient = false, hasServer = false;
        /**
         * 服务器禁止下载的配置文件列表
         */
        let newSForbidden: { [index: string]: boolean } = {}
        // 每拖一次文件，只加载一次全局配置
        for (let i = 0, len = files.length; i < len; i++) {
            let file = files[i];
            let re = path.parse(file.name);
            if (re.ext == ".xlsx") { // 只处理Excel
                if (!gcfg || !gcfg.project) {
                    // 得到全局配置路径
                    let globalCfgPath = path.join(file.path, "../..", "globalConfig.json");
                    gcfg = this.getGlobalCfg(globalCfgPath);
                }
                try {
                    let xlsx = new XLSXDecoder();
                    await xlsx.init(gcfg, file, cPath, sPath, i, cb, configKeyInfo, newSForbidden, useESModule);
                } catch (e) {
                    error("", e);
                    alert(`数据解析失败，发生错误：` + e.message);
                    return;
                }
            }
        }

        /**
         * 将指定文件夹中的JSON文件，统一打包成指定的单一数据文件
         * 
         * @param {string} inputDir
         * @param {string} outDir
         * @param {string} outFile
         * @param {string} ext
         * @param {boolean} [compress]
         * @param {string} [msg="公共数据"]
         * @returns
         */
        function packageDatas(inputDir: string, outDir: string, outFile: string, ext: string, compress?: boolean, msg = "公共数据") {
            let p = fs.statSync(inputDir);
            if (!p.isDirectory()) {
                error(`打包${msg}文件夹有误：${inputDir}`);
                return;
            }
            let outData: { [index: string]: any } = {};
            let flist = fs.readdirSync(inputDir);
            flist.forEach(file => {
                let re = path.parse(file);
                if (re.ext != Ext.Json) {
                    return;
                }
                let data = getData(path.join(inputDir, file));
                if (data != undefined) {
                    outData[re.name] = data;
                }
            });
            let cpath = writeAMFData(outFile, outDir, outData, ext, compress);
            if (cpath) {
                log(`${msg}文件保存至：${cpath}`, `#0c0`);
            } else {
                log(`${msg}文件保存失败`)
            }
        }
        function getData(file: string, err = "") {
            if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
                console.error(`找不到文件${file}`);
                return;
            }
            console.log(`getData ${file}`);
            let data;
            try {
                data = JSON.parse(fs.readFileSync(file, "utf8"));
            }
            catch (e) {
                error(`解析${err}数据，${file}时出错`, e);
            }
            return data;
        }

        function cb(file: File, _err: boolean, hasExtra: { hasClient?: boolean, hasServer?: boolean }) {
            if (hasExtra.hasClient) {
                hasClient = true;
            }
            if (hasExtra.hasServer) {
                hasServer = true;
            }
            let idx = unsolved.indexOf(file);
            if (~idx) {
                unsolved.splice(idx, 1);
            }
            if (unsolved.length == 0) {//全部文件处理完成
                let cout = "";
                if (hasClient) {
                    cout = makeExtraInterfaceFile(gcfg, cPath, true, !useESModule);
                }
                if (hasServer && gcfg.serverExtra) {
                    packageDatas(path.join(gcfg.serverPath, Extra), gcfg.serverPath, gcfg.serverExtra, Ext.ServerData);
                }
                if (cout) {
                    createContent($g("code"), "ExtraData", idx++, cout);
                }
                let cregout = "";
                // 尝试生成注册文件
                if (cPath && gcfg.clientRegClass) {
                    let clientReg: ClientRegTemplate = new ClientRegTemplate();
                    let modName = gcfg.clientModule || `jy.${gcfg.project}`;
                    let [cerr, crout] = clientReg.addToFile(path.join(cPath, gcfg.clientRegClass[1], gcfg.clientRegClass[0] + ".ts"), cFileNames, modName, gcfg.clientDataType == ClientDataType.PBBin, useESModule);
                    if (cerr) {
                        error(cerr);
                    } else {
                        saveCodeFile(cPath, gcfg.clientRegClass[1], crout, gcfg.clientRegClass[0], Ext.ClientCode);
                        cregout = crout;
                    }

                }
                if (cregout) {
                    createContent($g("code"), "字典", idx++, cregout);
                }
                //检查是否有完结处理
                if (gcfg.endScript) {
                    asyncFileLoad(gcfg.endScript, (er, data) => {
                        if (er) {
                            error(`处理加载结束脚本出错，${gcfg.endScript}`, er);
                            return
                        }
                        if (data) {
                            let script = data.toString();
                            let vm: typeof import("vm") = nodeRequire("vm");
                            let endScript = vm.createContext({ require: nodeRequire, console: console, writeJSONData: writeJSONData, readAMFData: readAMFData, writeAMFData: writeAMFData, gcfg: gcfg });
                            try {
                                vm.runInContext(script, endScript);
                            } catch (err1) {
                                error(`处理执行结束脚本出错，${gcfg.endScript}`, err1);
                            }
                        }
                    });
                }
                if (gcfg.endAction) {
                    var http: typeof import("http") = nodeRequire("http");
                    http.get(gcfg.endAction, res => {
                        let chunks: Buffer[] = [];
                        res.on("data", chunk => {
                            chunks.push(chunk as Buffer);
                        });
                        res.on("end", () => {
                            let result = Buffer.concat(chunks).toString("utf8");
                            result = result.replace(/\n/g, "<br/>")
                            log(result);
                        })
                    })
                }
                if (gcfg.clientEndCheck) {
                    solveCheck(gcfg.clientEndCheck, "客户端数据检测");
                }
                if (gcfg.serverEndCheck) {
                    solveCheck(gcfg.serverEndCheck, "服务端数据检测");
                }
            }
        }
    }

    /**
     * 获取全局配置
     */
    private getGlobalCfg(globalCfgPath: string, paths?: string[], unReplace?: boolean): GlobalCfg {
        if (!paths) {
            paths = [];
        }
        if (paths.indexOf(globalCfgPath) > -1) {
            error(`全局配置循环加载有误，加载的路径：[${paths.join(",")}]`);
            return null;
        }
        let cfg: GlobalCfg;
        if (fs.existsSync(globalCfgPath)) {
            paths.push(globalCfgPath);
            // 加载全局配置
            let globalJSON = fs.readFileSync(globalCfgPath, "utf8");

            try {
                cfg = <GlobalCfg>JSON.parse(globalJSON);
                if (cfg.remote) { // 当前全局配置，如果配了远程路径，加载远程路径，无视其他配置
                    return this.getGlobalCfg(cfg.remote, paths);
                }
                if (cfg.origin) {//如果有原始项
                    let ocfg = this.getGlobalCfg(cfg.origin, paths, true);
                    //使用新配置覆盖原始配置
                    for (let key in cfg) {
                        if (key != "origin") {
                            ocfg[key] = cfg[key];
                        }
                    }
                    cfg = ocfg;
                }
                cfg.clientDataType = ~~cfg.clientDataType;
                if (unReplace) {
                    return cfg;
                }
                //可替换的配置内容的key
                let replacableKeys = ["clientPath", "serverPath", "serverRegClass", "clientRegClass", "endScript", "endAction", "clientModule", "clientPreCheck", "serverPreCheck", "clientEndCheck", "serverEndCheck", "msgCode"];
                let replacer = cfg.replacer;
                if (!replacer) {
                    replacer = {};
                }
                checkReplacer(cfg, "lan", replacer);
                checkReplacer(cfg, "project", replacer);
                checkReplacer(cfg, "version", replacer);
                replacableKeys.forEach(key => {
                    if (key in cfg) {
                        let v = cfg[key];
                        cfg[key] = tryReplace(v, replacer);
                    }
                });

            } catch (e) {
                error("全局配置加载有误", e);
            }
        } else {
            error(`无法找到全局配置的路径：${globalCfgPath}`);
        }
        return cfg;
        function tryReplace(v: any, replacer: { [index: string]: string }) {
            if (typeof v === "string") {
                return doReplace(v, replacer);
            } else if (typeof v === "object") {
                for (let k in v) {
                    v[k] = tryReplace(v[k], replacer);
                }
            }
            return v;
        }
        function doReplace(value: string, replacer: { [index: string]: string }) {
            return value.replace(/[$][{]([^{}]+)[}]/g, (match, subkey) => {
                let value = replacer[subkey];
                return value !== undefined ? "" + value : match;
            });
        }
        function checkReplacer(cfg: any, key: string, replacer: { [index: string]: string }) {
            let v = cfg[key];
            if (v != undefined) {
                if (!(key in replacer)) {
                    replacer[key] = v;
                }
            }
        }
    }
}

new ExcelDataSaver();

/**
 * XLSX解析器
 */
class XLSXDecoder {


    constructor() {

    }
    async init(gcfg: GlobalCfg, file: File, cPath: string, sPath: string, idx: number, cb: { (file: File, error: boolean, hasExtra: { hasClient?: boolean, hasServer?: boolean }) }, configKeyInfo: { cFileNames: Map<string, ConfigKeyBin>, sFileNames: Map<string, ConfigKeyBin> }, newSForbidden: { [index: string]: boolean }, useESModule: boolean) {
        cPath = cPath || "";
        sPath = sPath || "";
        let fre = path.parse(file.name);
        let fname = fre.name;
        // let dirs: string[] = fre.dir.split(path.sep);
        let data = fs.readFileSync(file.path, "base64");
        let wb = XLSX.read(data);
        const Sheets = wb.Sheets;
        let utils = XLSX.utils;


        let list = utils.sheet_to_json(Sheets[SHEET_MAIN], { header: 1 });
        let listCfg = utils.sheet_to_json(Sheets[SHEET_CONFIG], { header: 1 });


        let rowCfgs: { [index: string]: string } = {
            // 第一列的中文: 对应后续用到的属性
            "支持的数据类型": null,// 不允许随便动
            "程序配置说明": "cfgDefineRow",// 说明
            "程序配置内容": "cfgRow",
            "前端解析": "clientRow",
            "后端解析": "serverRow",
            "默认值": "defaultRow",
            "数据类型": "typeRow",
            "描述": "desRow",
            "属性名称": "nameRow"//必须为配置的最后一行
        }



        /**
         * 数据起始行
         */
        let dataRowStart: number = 0;
        let rowCfgLines: { [index: string]: number } = {};
        let len = list.length;
        // 先遍历所有行，直到得到"属性名称"行结束
        for (let i = 0; i < len; i++) {
            let rowData = list[i];
            let col1 = rowData[0];
            if (col1 in rowCfgs) {
                let key = rowCfgs[col1];
                if (key != null) {
                    rowCfgLines[key] = i;
                    if (key == "nameRow") {
                        dataRowStart = i + 1;
                        break;
                    }
                }
            }
        }
        let cfgRowList = list;
        let cfgRow;
        if (listCfg && listCfg.length) {
            let len2 = listCfg.length;
            // 先遍历所有行，直到得到"属性名称"行结束
            for (let i = 0; i < len2; i++) {
                let rowData = listCfg[i];
                let col1 = rowData[0];
                if (col1 in rowCfgs) {
                    let key = rowCfgs[col1];
                    if (key != null) {
                        rowCfgLines[key] = i;
                        if (key == "nameRow") {
                            dataRowStart = i + 1;
                            break;
                        }
                    }
                }
            }
            //检查 listCfg
            cfgRowList = listCfg;
        }
        cfgRow = cfgRowList[rowCfgLines["cfgRow"]];
        if (!cfgRow) {
            error(`表[${fname}]的配置有误，没有 "程序配置内容"这一行`);
            return;// cb(file, true, {});
        }
        /**
         * 支持的配置的名称定义
         */
        var cfgDefines = {
            plugin: "插件路径",
            useRaw: "不做基础处理",
            cfilePackage: "前端包结构",
            sfilePackage: "后端包结构",
            cSuper: "前端继承类",
            sSuper: "后端继承类",
            cInterfaces: "前端实现接口",
            sInterfaces: "后端实现接口",
            pluginParams: "插件参数",
            clientMainKey: "客户端主键",
            sForbidden: "后端禁用此表",
            cLineRange: "前端数据范围",//数据格式：m:n|x:y
            cTableType: "前端数据集类型",
            cInstanceType: "前端类型",
        }

        let cfgDefineRow = <any[]>cfgRowList[rowCfgLines["cfgDefineRow"]];
        //已支持的配置属性
        let cfgCols: {
            plugin?: number,
            useRaw?: number,
            cfilePackage?: number,
            sfilePackage?: number,
            cSuper?: number,
            sSuper?: number,
            cInterfaces?: number,
            sInterfaces?: number,
            pluginParams?: number,
            clientMainKey?: number,
            sForbidden?: number,
            cLineRange?: number,
            cTableType?: number,
            cInstanceType?: number,
        };
        if (cfgDefineRow) {
            cfgCols = {};
            for (let i = 0, len = cfgDefineRow.length; i < len; i++) {
                let defineName = cfgDefineRow[i];
                for (let key in cfgDefines) {
                    if (defineName == cfgDefines[key]) {
                        cfgCols[key] = i;
                        break;
                    }
                }
            }

        } else {//使用模板表的对应配置
            cfgCols = {
                plugin: 1,
                useRaw: 2,
                cfilePackage: 3,
                sfilePackage: 4,
                cSuper: 5,
                sSuper: 6,
                cInterfaces: 7,
                sInterfaces: 8,
                pluginParams: 9,
                clientMainKey: 10,
                sForbidden: 11,
                cLineRange: 12,
                cTableType: 13,
                cInstanceType: 14,
            }
        }

        // 制空第 0 列 数据
        cfgRow[0] = undefined;

        // 先处理附加数据
        let hasExtra: {
            hasClient: boolean;
            hasServer: boolean;
            server: any;
        };
        try {
            hasExtra = this.parseExtraData(wb, fname, gcfg);
        } catch (e) {
            error(e.message);
            return;
        }

        let plugin: string = cfgRow[~~cfgCols.plugin] || "";
        plugin = plugin.trim();
        // 是否不做基础处理
        let useRaw = plugin == "" ? false : !!cfgRow[~~cfgCols.useRaw];
        let pluginParams = cfgRow[~~cfgCols.pluginParams];
        if (dataRowStart == 0 && !useRaw) {
            error(`表[${fname}]的配置有误，没有配置使用原始值，并且没有 "属性名称"这一行`);
            return;// cb(file, true, hasExtra);
        }

        let cfilePackage: string = cfgRow[~~cfgCols.cfilePackage] || "";
        if (cfilePackage) cfilePackage = cfilePackage.trim();
        let sfilePackage: string = cfgRow[~~cfgCols.sfilePackage] || "";
        if (sfilePackage) sfilePackage = sfilePackage.trim();
        let cSuper = cfgRow[~~cfgCols.cSuper] || ""; //前端基类
        let sSuper = cfgRow[~~cfgCols.sSuper] || ""; //后端基类
        let cInterfaces: string[], sInterfaces: string[];
        let strCInters: string = cfgRow[~~cfgCols.cInterfaces];
        if (strCInters) {
            cInterfaces = strCInters.split(",");
        } else {
            cInterfaces = [];
        }
        let strSInters: string = cfgRow[~~cfgCols.sInterfaces];
        if (strSInters) {
            sInterfaces = strSInters.split(",");
        } else {
            sInterfaces = [];
        }
        let clientMainKey = cfgRow[~~cfgCols.clientMainKey];
        let cTableType = +cfgRow[~~cfgCols.cTableType];
        //判断表单类型
        if (!clientMainKey) {
            if (cTableType && cTableType != CfgDataType.Array) {
                error(`配置了[${cfgDefines.clientMainKey} : ${clientMainKey}]，但是设置的[${cfgDefines.cTableType} : ${cTableType}]有误`)
            }
            cTableType = CfgDataType.Array;
        } else if (!cTableType) {
            cTableType = CfgDataType.Dictionary;
        }
        //判断配置类型
        let cInstanceType = ~~cfgRow[~~cfgCols.cInstanceType];

        newSForbidden[fname] = !!cfgRow[~~cfgCols.sForbidden];
        let strCLineRange: string = cfgRow[~~cfgCols.cLineRange];
        let checkers = TypeCheckers;
        let cLineRange: { 0: number, 1: number }[];
        if (strCLineRange) {
            let array2DChecker = checkers[TypeCheckerKey.Array2D];
            cLineRange = array2DChecker.check(strCLineRange);
        }
        let fileCfg = {
            sSuper,
            cSuper,
            cfilePackage,
            sfilePackage,
            cInterfaces,
            sInterfaces,
            clientMainKey,
            cTableType,
            cInstanceType,
            cLineRange,
            name: fname,
            path: file.path,
            cPath,
            sPath
        } as FileConfig
        /**
         * 检查行是否在范围内
         * 
         * @param {number} line 
         * @returns 
         */
        function isInRange(line: number) {
            if (!cLineRange) return true;
            for (let range of cLineRange) {
                if (line >= range[0] && line <= range[1]) {
                    return true;
                }
            }
        }
        let cMainKeyType: string, sMainKeyType: string;

        let defines: ProDefine[] = [];

        let sdatas = [];
        /**
         * 原始的数据
         */
        let cRawDatas = [];

        let genPluginData = plugin && !useRaw ? [] : undefined;
        /**
         * 客户端是否需要生成类文件
         */
        let cNeedGen = false;
        /**
         * 服务端是否需要生成类文件
         */
        let sNeedGen = false;

        let rowHasData = {};
        if (!useRaw) {
            /**
             * 前端是否解析此数据
             */
            let clientRow = list[rowCfgLines["clientRow"]];
            /**
             * 后端是否解析此数据
             */
            let serverRow = list[rowCfgLines["serverRow"]];

            let defaultRow = list[rowCfgLines["defaultRow"]] || [];
            /**
             * 类型列
             */
            let typeRow = list[rowCfgLines["typeRow"]];
            /**
             * 描述列
             */
            let desRow = list[rowCfgLines["desRow"]];
            /**
             * 属性名称列
             */
            let nameRow = list[rowCfgLines["nameRow"]] as any;

            let max = 0;
            for (let key in nameRow) {
                let col = +key;
                if (col != 0) {
                    let client = +clientRow[col];
                    let server = gcfg.serverExportAll ? ProType.Common : +serverRow[col];
                    let desc = "" + desRow[col];
                    let name = "" + nameRow[col];
                    //检查属性名称
                    let errmsg = checkProName(name, gcfg, `表[${fname}.xlsx]，字段：[${name}]，`);
                    if (errmsg) {
                        throw Error(errmsg);
                    }
                    let type = typeRow[col] || "";
                    let checker = checkers[type];
                    if (!checker) {
                        throw Error(`表[${fname}.xlsx]，字段：[${name}]，配置了非法的数据类型："${type}"，请检查`);
                    }
                    if (name == clientMainKey) {
                        cMainKeyType = checker.idx == TypeCheckerIndex.Number ? "number" : "string";
                    }
                    let def = defaultRow[col];
                    def = checker.check(def);
                    defines[col] = { client, server: server, checker, name, desc, def, dataRows: new Map() };
                    if (col > max) {
                        max = col;
                    }
                    if (client) {
                        cNeedGen = true;
                        if (client == ProType.ServerWithJSON) {//需要将这些字段打包成json字符串并生成到服务端文件中
                            sNeedGen = true;
                        }
                    }
                    if (server) {
                        sNeedGen = true;
                    }
                }
            }
            // 从第9行开始，是正式数据
            for (let row = dataRowStart; row < len; row++) {
                let rowData = list[row];
                if (Array.isArray(rowData) && rowData.length == 0) {
                    continue;
                }
                let col1 = rowData[0];
                if (!col1 || (col1 + "").charAt(0) != "!") {
                    // 先做空行检查，减少误报信息
                    let pluginData: Object;
                    if (genPluginData) {
                        pluginData = {};
                        genPluginData.push(pluginData);
                    }
                    let sRow = {};
                    let cRawRow = {};
                    let hasServer = false;
                    let hasClientRaw = false;
                    let $cData = null;
                    for (let col = 1; col <= max; col++) {
                        let cell = rowData[col];
                        let def = defines[col];
                        if (def) {
                            let { server, client } = def;
                            if (server) {
                                let scell = cell == undefined ? def.def : cell;
                                if (scell) {
                                    let dat = def.checker.serverCheck(scell || "");
                                    sRow[def.name] = dat;
                                }
                                hasServer = true;
                            }
                            if (client) {
                                let ccell = cell == undefined ? def.def : cell;
                                if (ccell) {
                                    let dat = def.checker.check(cell || "");
                                    cRawRow[def.name] = dat;
                                }
                                hasClientRaw = true;
                            }
                            if (cell != undefined) {
                                let checker = def.checker;
                                let cellValue;
                                try {
                                    cellValue = checker.check(cell || "");
                                } catch (e) {
                                    throw Error(`解析${fname}第${row + 1}行，第${XLSX.utils.encode_col(col)}列数据有误：${e.message}`);
                                }
                                if (client == ProType.ServerWithJSON) {
                                    if (!$cData) {
                                        $cData = {};
                                    }
                                    $cData[def.name] = cellValue;
                                    hasServer = true;
                                } else if (cellValue != def.def && (def.def != checker.def || cellValue != checker.def)) {
                                    if (pluginData) {
                                        if (def.name) {
                                            pluginData[def.name] = cellValue;
                                        }
                                    }
                                    def.dataRows.set(row, cellValue);
                                    // 没有def的为注释列
                                    if (client || server) {
                                        rowHasData[row] = true;
                                    }
                                }
                            }
                        }
                    }
                    if ($cData) {
                        sRow["$cdata"] = JSON.stringify($cData);
                    }
                    if (hasServer) {
                        sdatas.push(sRow);
                    }
                    if (hasClientRaw) {
                        cRawDatas.push(cRawRow);
                    }
                }
            }
        }

        let cOut = doSortAndGetData(defines, "client");


        //对defines进行排序
        function doSortAndGetData(defines: ProDefine[], key: string) {
            let outDef = defines.filter(def => !!def[key]);
            outDef.sort((a, b) => b.dataRows.size - a.dataRows.size);
            let outData = [];
            let shead = outDef.map<HeadItem>(def => {
                let isLocal = +(def[key] == 2);
                let hasData = +(def.dataRows.size > 0);
                let type = isLocal << 1 | hasData;
                let idx = def.checker.idx;
                if (hasData) {
                    if (idx == TypeCheckerIndex.Any) {//先看string是否可以优化成number
                        if (!def.def) {
                            let flag = true;
                            for (let v of def.dataRows.values()) {
                                if (+v != v) {
                                    flag = false;
                                    break;
                                }
                            }
                            if (flag) {
                                idx = TypeCheckerIndex.Number;
                            }
                        }
                    }
                }
                //检查数据是否可以进行优化
                if (idx == TypeCheckerIndex.Number) {
                    //遍历数据，检查数据是否都为int32
                    let flag = true;
                    if (def.def && ~~def.def != def.def) {
                        flag = false;
                    } else {
                        for (let v of def.dataRows.values()) {
                            if (~~v != v || v > 1073741823 || v < -1073741824) {
                                flag = false;
                                break;
                            }
                        };
                    }
                    if (flag) {
                        idx = TypeCheckerIndex.Int32;
                    }
                }
                let out = [def.name, idx];
                if (def.def != def.checker.def) {
                    out.push(type, def.def);
                } else {
                    if (type != 0) {
                        out.push(type);
                    }
                }
                return out as HeadItem;
            });
            outData.push(shead);

            let dataMaxIdx = outDef.length;
            for (let i = 0; i < dataMaxIdx; i++) {
                let def = outDef[i];
                if (!def.dataRows.size) {
                    dataMaxIdx = i;
                    break;
                }
            }

            for (let row = dataRowStart; row < len; row++) {
                if (!rowHasData[row] || !isInRange(row)) continue;
                let cRow = [];
                //先检查此行开始有数据的序列
                let max = dataMaxIdx - 1;
                for (let i = max; i >= 0; i--) {
                    let def = outDef[i];
                    let v = def.dataRows.get(row);
                    if (v != undefined) {
                        max = i;
                        break;
                    }
                }

                for (let i = 0; i <= max; i++) {
                    let def = outDef[i];
                    let v = def.dataRows.get(row);
                    v = def.checker.getOutValue(v, def.def);
                    cRow.push(v);
                }
                if (cRow.length) {
                    outData.push(cRow);
                }
            }
            return outData;
        }


        let pData;
        if (gcfg.clientPreCheck || gcfg.serverPreCheck || plugin) {
            pData = { gcfg, filename: fname, rawData: list, cdatas: cOut, sdatas, defines: defines, dataRowStart: dataRowStart, rowCfg: rowCfgLines, pluginData: genPluginData, pluginParams: pluginParams, cPath, sPath, cfilePackage, sfilePackage, cSuper, sSuper, cInterfaces, sInterfaces }
            function _toJSON() {
                return {
                    as3Type: this.type,
                    javaType: this.javaType
                }
            }
            for (let checkKey in TypeCheckers) {
                let checker = TypeCheckers[checkKey];
                checker["toJSON"] = _toJSON;
            }
        }

        if (gcfg.clientPreCheck) {
            await solveCheck(gcfg.clientPreCheck, "客户端预检测", pData);
        }

        if (gcfg.serverPreCheck) {
            await solveCheck(gcfg.clientPreCheck, "服务端预检测", pData);
        }

        if (plugin) {
            new PluginLoader(plugin, pData, m => {
                let mtype = m.type;
                if (mtype == "error") {
                    let emsg = "";
                    switch (m.error) {
                        case PluginErrorType.ExecuteFailed:
                            emsg = `插件：${plugin}执行失败，检查插件代码！`;
                            break;
                        case PluginErrorType.LoadFailed:
                            emsg = `插件：${plugin}加载失败，请检查路径是否正确！`;
                            break;
                        case PluginErrorType.InitFailed:
                            emsg = `插件：${plugin}初始化失败，检查插件代码！`;
                            break;
                        default:
                            emsg = `插件：${plugin}出现未知！`;
                            break;
                    }
                    let err = m.err || new Error("");
                    err.message += "\n附加信息：" + emsg;
                    throw err;
                } else if (mtype == "success") {//插件处理完成
                    log(`插件数据处理完成：\n${m.output || ""}`);
                    if (!useRaw) {
                        writeData(m.cdatas || [], m.sdatas || [], gcfg, m.makeBin);
                    } else {
                        cb(file, false, hasExtra);
                    }
                }
            });
            return;
        }

        writeData(cOut, sdatas, gcfg, true, cRawDatas);
        return
        /**
         * 
         * 写最终数据
         * @param {any[]} cdatas
         * @param {any[]} sdatas
         */
        function writeData(cdatas: any[], sdatas: any[], gcfg: GlobalCfg, makeBin?: boolean, cRawDatas?: any[]) {
            const { clientDataType, serverDataType } = gcfg;
            let cext: string;
            if (clientDataType == ClientDataType.Json) {
                cext = Ext.Json;
            } else if (clientDataType == ClientDataType.PBBin) {
                cext = Ext.Bin;
            }
            // 导出客户端数据
            if (cdatas.length > 1) {
                let cpath: string;
                if (clientDataType == ClientDataType.Json) {
                    cpath = writeJSONData(fname, gcfg.clientPath, cRawDatas);
                } else if (clientDataType == ClientDataType.PBBin) {
                    if (!makeBin) {
                        //先将数据还原
                        cpath = writeJSONData(fname, gcfg.clientPath, cdatas);
                    } else {
                        cpath = writeCommonBinData(fname, gcfg.clientPath, cdatas);
                    }
                }
                if (cpath) {
                    log(`文件${file.name}，将客户端数据保存至：${cpath}`);
                } else {
                    log(`文件${file.name}，未将客户端数据保存到${cpath}，请检查`)
                }
            } else {
                tryDeleteFile(fname, gcfg.clientPath);
                tryDeleteFile(fname, gcfg.clientPath, cext);
            }

            let sext: string;
            if (serverDataType == ServerDataType.Json) {
                sext = Ext.Json;
            } else if (serverDataType == ServerDataType.Jat) {
                sext = Ext.ServerData;
            }
            // 导出服务端数据
            if (sdatas.length) {
                let spath: string;
                if (serverDataType == ServerDataType.Json) {
                    spath = writeJSONData(fname, gcfg.serverPath, sdatas);
                } else if (serverDataType == ServerDataType.Jat) {
                    spath = writeAMFData(fname, gcfg.serverPath, sdatas);
                }
                if (spath) {
                    log(`文件${file.name}，将服务端数据保存至：${spath}`, `#0c0`);
                } else {
                    log(`文件${file.name}，未将服务端数据保存到${gcfg.serverPath}，请检查`)
                }
            } else {
                tryDeleteFile(fname, gcfg.serverPath, sext);
            }

            const serverCodeMaker = window.serverCodeMaker;

            if (serverCodeMaker) {
                serverCodeMaker.init(fileCfg, gcfg);
            }

            let cPros: string[] = [];
            // let sPros: string[] = [];
            let cout: string = "", sout: string = "";
            let cFlag: boolean;
            let cLocal: string[] = [];
            let cSData: string[] = [];

            for (let define of defines) {
                if (!define) {
                    continue;
                }
                let checker = define.checker;
                let proA = ["/**"];
                let descs = define.desc.trim().split(/\r\n|\r|\n/g);
                descs.forEach(line => {
                    if (line) {
                        proA.push(` * ${line}  `);
                    }
                });
                proA.push(` */`);
                proA.push(`${define.name}: ${checker.type};`);

                let def = "";
                if (define.def) {
                    def = define.def;
                }
                let client = define.client;
                if (client == ProType.Common) {
                    proA.forEach(line => {
                        cPros.push(line);
                    })
                } else if (client == ProType.Local) {
                    proA.forEach(line => {
                        cLocal.push(line);
                    })
                } else if (client == ProType.ServerWithJSON) {
                    proA.forEach(line => {
                        cSData.push(line);
                    })
                }

                let server = define.server;
                if (serverCodeMaker && server == ProType.Common) {//如果设置为2则不自动生成代码，但是会存储数据
                    serverCodeMaker.addProperty(define, checker, descs);
                    // sPros.push(`private ${checker.javaType} ${define.name};`);
                    // sPros.push(`/**`);
                    // descs.forEach(line => {
                    //     sPros.push(` * ${line}  `);
                    // });
                    // sPros.push(` */`);
                    // sPros.push(`public ${checker.javaType} get${getJavaName(define.name)}() {`);
                    // sPros.push(`\treturn ${define.name};`);
                    // sPros.push(`}`);
                    // sPros.push(`public void set${getJavaName(define.name)}(${checker.javaType} ${define.name}) {`);
                    // sPros.push(`\tthis.${define.name} = ${define.name};`);
                    // sPros.push(`}`);
                }
            }

            let createTime = new Date().format("yyyy-MM-dd HH:mm:ss");
            let cIsClass: boolean;
            let ext = Ext.ClientCode;
            if (cfilePackage != undefined) {
                if (cNeedGen) {
                    let className = fname + Suffix.Client;
                    let fileName = path.join(cPath, cfilePackage, className);
                    let cdict = getManualCodeInfo([fileName + Ext.ClientCode, fileName + Ext.ClientDefine]);
                    // 生成客户端代码
                    if (cPros) {
                        let hasDecode = !!cLocal.length || hasManualAreaCode("$decode", cdict);
                        let isClass = hasDecode || !!cSuper;
                        if (!isClass) {
                            let area2 = getRawManualAreaCode("$area2", cdict);
                            if (area2) {
                                // 检查area2中，是否出现 #12 提到的
                                // 必须生成class的情况有：
                                // 1. 有赋值的情况
                                // 2. 有 getter  setter的情况
                                // 3. 以及有方法的情况

                                // 过滤掉注释的内容
                                var tokenizer = /"|(\/\*)|(\*\/)|(\/\/)|\n|\r/g,
                                    in_string = false,
                                    in_multiline_comment = false,
                                    in_singleline_comment = false,
                                    tmp, tmp2, new_str = [], ns = 0, from = 0, lc: string, rc: string;

                                tokenizer.lastIndex = 0;

                                while (tmp = tokenizer.exec(area2)) {
                                    lc = RegExp["$`"];
                                    rc = RegExp["$'"];
                                    if (!in_multiline_comment && !in_singleline_comment) {
                                        tmp2 = lc.substring(from);
                                        if (!in_string) {
                                            tmp2 = tmp2.replace(/(\n|\r|\s)*/g, "");
                                        }
                                        if (tmp2) {
                                            new_str[ns++] = tmp2;
                                        }
                                    }
                                    from = tokenizer.lastIndex;

                                    if (tmp[0] == "\"" && !in_multiline_comment && !in_singleline_comment) {
                                        tmp2 = lc.match(/(\\)*$/);
                                        if (!in_string || !tmp2 || (tmp2[0].length % 2) == 0) {	// start of string with ", or unescaped " character found to end string
                                            in_string = !in_string;
                                        }
                                        from--; // include " character in next catch
                                        rc = area2.substring(from);
                                    }
                                    else if (tmp[0] == "/*" && !in_string && !in_multiline_comment && !in_singleline_comment) {
                                        in_multiline_comment = true;
                                    }
                                    else if (tmp[0] == "*/" && !in_string && in_multiline_comment && !in_singleline_comment) {
                                        in_multiline_comment = false;
                                    }
                                    else if (tmp[0] == "//" && !in_string && !in_multiline_comment && !in_singleline_comment) {
                                        in_singleline_comment = true;
                                    }
                                    else if ((tmp[0] == "\n" || tmp[0] == "\r") && !in_string && !in_multiline_comment && in_singleline_comment) {
                                        in_singleline_comment = false;
                                    }
                                    else if (!in_multiline_comment && !in_singleline_comment && !(/\n|\r|\s/.test(tmp[0]))) {
                                        new_str[ns++] = tmp[0];
                                    }
                                }
                                new_str[ns++] = rc;
                                area2 = new_str.join("");

                                //检查area2中是否有 `=`
                                //有 = 必然有赋值 
                                //有 /\)\s*?\{/ 必有方法实体，唯一例外的情况是 ") {" 作为key出现在字符串中，如 m:{") {":string}，但实际项目中还没有出现过这种情况
                                area2 = area2.replace(/"[^"].*?"|'[^'].*?'/g, `""`);
                                isClass = /=|\)\s*?\{/mg.test(area2);
                            }
                        }
                        if (cInstanceType == CfgInstanceType.Class) {//配置中写了是class，不做判断，强制按class解析
                            isClass = true;
                        }
                        cIsClass = isClass;
                        let classHead: string;
                        let modName = gcfg.clientModule || `jy.${gcfg.project}`;
                        let namespace = "namespace";
                        if (isClass) {
                            classHead = `export class ${className}${cSuper ? " extends " + cSuper : ""}${cInterfaces.length ? " implements " + cInterfaces.join(",") : ""}`;
                        } else {
                            ext = Ext.ClientDefine;
                            if (useESModule) {
                                classHead = `interface ${className}${cInterfaces.length ? " extends " + cInterfaces.join(",") : ""}`
                            } else {
                                namespace = "declare namespace";
                                classHead = `export interface ${className}${cInterfaces.length ? " extends " + cInterfaces.join(",") : ""}`
                            }
                        }
                        let outlines = [
                            `/**`,
                            `* 由junyouH5数据生成工具，从${file.path}生成`,
                            `* 创建时间：${createTime}`,
                            `**/`,
                        ]
                        if (!useESModule) {
                            outlines.push(
                                `${namespace} ${modName} {`,
                                `\t${genManualAreaCode("$area1", cdict, "\t")}`,
                            )
                        }
                        if (cPros.length || cLocal.length || hasDecode) {
                            cFlag = true;
                            outlines.push(
                                `\t${classHead} {`,
                                `\t\t${cPros.join("\n\t\t")}`,
                                `\t\t${genManualAreaCode("$area2", cdict, `\t\t`)}`,
                            )
                            if (hasDecode) {
                                outlines.push(
                                    `\t\tpublic decode(${cLocal.length ? `local: Local` : ""}) {`,
                                    `\t\t\t${genManualAreaCode("$decode", cdict, `\t\t\t`)}`,
                                    `\t\t}`
                                )
                            }
                            outlines.push(
                                `\t}`
                            )
                            if (cLocal.length) {
                                outlines.push(
                                    `\tinterface Local{`,
                                    `\t\t${cLocal.join("\n\t\t")}`,
                                    `\t}`,
                                )
                            }

                            let type: string;
                            let modulePrefix = useESModule ? "" : `${modName}.`
                            switch (cTableType) {
                                case CfgDataType.Array:
                                    type = `${modulePrefix}${className}[]`;
                                    break;
                                case CfgDataType.ArraySet:
                                    type = `ArraySet<${modulePrefix}${className}>`;
                                    break;
                                case CfgDataType.Dictionary:
                                    type = `{ [${clientMainKey}: ${cMainKeyType}]: ${modulePrefix}${className} }`;
                                    break;
                            }
                            outlines.push(
                                `\t${useESModule ? "" : "export"} interface CfgData {`,
                                `\t\t${fname}: ${type}`,
                                `\t}`,
                                `\t${genManualAreaCode("$area3", cdict, `\t`)}`,
                            )
                        }

                        if (cSData.length) {
                            outlines.push(
                                `\t/**`,
                                `\t* 此数据通过服务端协议获得，此处只增加定义`,
                                `\t**/`,
                                `\t${useESModule ? "" : "export"} interface $${className} {`,
                                `\t\t${cSData.join("\n\t\t")}`,
                                `\t\t${genManualAreaCode(`$cdata`, cdict, `\t\t`)}`,
                                `\t}`,
                            )
                        }
                        if (!useESModule) {
                            outlines.push(
                                `}`,
                                `${genManualAreaCode("$area4", cdict)}`
                            )
                        }
                        cout = outlines.join("\n");
                    }
                    // 尝试存储文件
                    saveCodeFile(cPath, cfilePackage, cout, className, ext);
                }
                else {
                    log(`客户端没有任何字段有输出，无需生成${fname}`, `#0a0`);
                }
            } else {
                log(`客户端没有配置[前端包结构]，无需生成${fname}`, `#0a0`);
            }
            if (sfilePackage != undefined) {
                if (sNeedGen) {
                    // 生成服务端代码
                    if (serverCodeMaker) {
                        let result = serverCodeMaker.flash();
                        if (result) {
                            let { code, packagePath, className } = result;
                            sout = code;
                            saveCodeFile(sPath, packagePath, sout, className, Ext.ServerCode);
                        } else {
                            log(`服务端没有任何字段有输出，无需生成${fname}${Ext.ServerCode}`, `#0a0`);
                        }
                    }
                } else {
                    log(`服务端没有配置[后端包结构]，无需生成${fname}${Ext.ServerCode}`, `#0a0`);
                }
                createContent($g("code"), fname, idx++, cout, sout);
                // 尝试生成注册文件
                if (cFlag && cPath && gcfg.clientRegClass) {
                    let setting = {} as ConfigKeyBin;
                    setting.isClass = cIsClass;
                    setting.mainKey = clientMainKey;
                    setting.type = cTableType;
                    setting.fname = fname;
                    if (hasExtra.hasClient) {
                        setting.hasExtra = true;
                    }
                    configKeyInfo.cFileNames.set(fname, setting);
                }

                cb(file, false, hasExtra);
            }
        }
    }

    /**
     * 
     * 检查附加数据
     * 附加数据形式为 Key Value式的
     * @private
     * @param {$XLSX.IWorkBook} wb
     * @param {string}  fname   表名
     * @param {GlobalCfg} gcfg  全局配置
     * @throws {Error}
     */
    private parseExtraData(wb: $XLSX.IWorkBook, fname: string, gcfg: GlobalCfg) {
        let ws = wb.Sheets[SHEET_EXTRA];
        let hasClient: boolean, hasServer: boolean;
        if (!ws) {//没有附加数据表
            return { hasClient, hasServer, server: undefined };
        }
        let list = XLSX.utils.sheet_to_json(ws);
        let len = list.length;
        let client = [];
        let server = {};
        let checkers = TypeCheckers;
        let cExtraBins = [];
        for (let row = 0; row < len; row++) {
            let data = list[row];
            let key: string = data["标识"] + "";
            if (key && (key = key.trim())) {
                let errmsg = checkProName(key, gcfg, `解析表[${fname}]附加数据中标识[${key}]有误，`);
                if (errmsg) {
                    throw Error(errmsg);
                }
                let raw = data["数据"];
                let clientParse = !!data["前端解析"];
                let serverParse = !!data["后端解析"];
                let type = data["数据类型"] || "";
                let checker = checkers[type];
                if (!checker) {
                    throw Error(`表[${fname}.xlsx]，附加数据配置有误，[${JSON.stringify(data)}]，请检查`);
                }
                let value;
                try {
                    value = checker.check(raw);
                } catch (e) {
                    throw Error(`解析${fname}第${row + 1}行，数据有误：${e.message}`);
                }
                let bin = <ExtraBin>{};
                bin.desc = data["描述"];
                bin.key = key;
                bin.value = value;
                bin.type = checker.type;
                if (clientParse) {
                    cExtraBins.push(bin);
                    client.push(key, value);
                    if (checker.solveString) {
                        client.push(+checker.idx);
                    }
                }
                if (serverParse || gcfg.serverExportAll) {
                    server[key] = checker.serverCheck(raw);
                    hasServer = true;
                }
            }
        }

        let clientDir = path.join(gcfg.clientPath, Extra);
        if (!fs.existsSync(clientDir)) {//如果没有，自动创建
            fs.mkdirSync(clientDir);
        }
        let serverDir = path.join(gcfg.serverPath, Extra);
        if (!fs.existsSync(serverDir)) {//如果没有，自动创建
            fs.mkdirSync(serverDir);
        }
        let ofname = fname;
        fname = "$" + fname;
        //存储附加文件数据
        //数据为 string,any[,number]...string,any[,number]
        hasClient = client.length > 0;
        if (hasClient) {
            let cpath = writeJSONData(fname, gcfg.clientPath, client);
            if (cpath) {
                log(`文件${fname}，将客户端附加数据保存至：${cpath}`);
            } else {
                log(`文件${fname}，未将客户端附加数据保存到${cpath}，请检查`)
            }
            cpath = writeJSONData(ofname, clientDir, cExtraBins);
            if (cpath) {
                log(`附加数据配置文件${ofname}，将客户端附加数据保存至：${cpath}`, `#0c0`);
            } else {
                log(`附加数据配置文件${ofname}，未将客户端附加数据保存，请检查路径:${clientDir}`)
            }
        } else {//尝试删除多生成的文件
            tryDeleteFile(fname, gcfg.clientPath);
            tryDeleteFile(ofname, clientDir);
        }
        if (hasServer) {
            let spath = writeJSONData(ofname, serverDir, server);
            if (spath) {
                log(`文件${ofname}，将服务端附加数据保存至：${spath}`, `#0c0`);
            } else {
                log(`文件${ofname}，未将服务端附加数据保存到，请检查路径:${serverDir}`)
            }
        } else {//尝试删除多生成的文件
            tryDeleteFile(ofname, serverDir);
        }
        return { hasClient, hasServer, server };
    }


}

/**
 * 尝试删除文件
 * 
 * @param {string} fname
 * @param {string} dir
 * @param {string} [ext=Ext.Json]
 */
function tryDeleteFile(fname: string, dir: string, ext: string = Ext.Json) {
    let fullPath = path.join(dir, fname + ext);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        log(`删除文件${fullPath}`, "#cc0")
    }
}

/**
   * 存储文件
   * 
   */
function saveCodeFile(dir: string, filePackage: string, content: string, fname: string, ext: string) {
    if (!content) {
        return;
    }
    if (dir) {
        fname += ext
        let fullPath = filePackage ? path.join(dir, filePackage) : dir;
        if (fullPath) {
            if (fs.existsSync(fullPath)) {
                let re = fs.statSync(fullPath);
                if (re.isDirectory()) {
                    let file = path.join(fullPath, fname);
                    if (fs.existsSync(file)) {// 有原始文件
                        let originContent = fs.readFileSync(file, "utf8");
                        //yyyy-MM-dd HH:mm:ss
                        originContent = originContent.replace(/\s*[/][*][*]\s+[*][ ]由junyouH5数据生成工具，[^]*?创建时间：\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}:\d{2}\s+[*][*][/]\s*/, "").replace(/\r\n/g, "\n");
                        let newData = content.replace(/\s*[/][*][*]\s+[*][ ]由junyouH5数据生成工具，[^]*?创建时间：\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}:\d{2}\s+[*][*][/]\s*/, "").replace(/\r\n/g, "\n");
                        if (originContent == newData) {
                            log(`和${file}内容相同，无需生成`, "#cc0");
                            return;
                        }
                    }
                    try {
                        fs.writeFileSync(file, content);
                    }
                    catch (e) {
                        error(`写入文件时失败，路径："${fullPath}"，文件名："${fname}"，错误信息：${e.message}\n${e.stack}`);
                        return;
                    }
                    log(`生成代码成功，${file}`, "#0c0");
                    return;
                }
            }
        }
        error(`生成路径有误，无法生成，路径："${fullPath}"，文件名："${fname}"`);
    }
}

/**
 * 创建一个代码区
 * 
 * @private
 * @param {HTMLElement} parent (description)
 * @param {string} filename (description)
 * @param {number} idx (description)
 * @param {string} ccode (description)
 * @param {string} scode (description)
 */
function createContent(parent: HTMLElement, filename: string, idx: number, ccode: string, scode = "") {
    let pane = document.createElement("div");
    let style = pane.style;
    style.border = "#000 solid 1px";
    style.width = "100%";
    style.cssFloat = "left";
    let idCopyClient = "btnCopyClient" + idx;
    let idCopyServer = "btnCopyServer" + idx;
    let template = `<div>${filename}</div>
    <div style="width:50%;float:left;background:#eef">
        客户端代码：<input type="button" value="复制客户端代码" id="${idCopyClient}" />
        <pre style="width:100%;border:#ccf solid 1px;background:#000;color:#fff;font:'Microsoft Yahei';overflow:auto;"><code>${hljs.highlightAuto(ccode, ["typescript"]).value}</code></pre>
    </div>
    <div style="width:50%;float:left;background:#fee">
        服务端代码：<input type="button" value="复制服务端代码" id="${idCopyServer}" />
        <pre style="width:100%;border:#ccf solid 1px;background:#000;color:#fff;font:'Microsoft Yahei';overflow:auto;"><code>${hljs.highlightAuto(scode, ["java"]).value}</code></pre>
    </div>`
    pane.innerHTML = template;
    parent.appendChild(pane);
    $g(idCopyClient).addEventListener("click", e => {
        clipboard.writeText(ccode);
    });
    $g(idCopyServer).addEventListener("click", e => {
        clipboard.writeText(scode);
    });
}

/**
 * 创建附加数据的接口文件
 * 
 * @param {GlobalCfg} gcfg
 * @param {boolean} [isClient]
 */
function makeExtraInterfaceFile(gcfg: GlobalCfg, codePath: string, isClient?: boolean, hasNamespace?: boolean) {
    let d = isClient ? gcfg.clientPath : gcfg.serverPath;
    hasNamespace = !isClient ? false : hasNamespace;
    let inputDir = path.join(d, Extra);
    let p = fs.statSync(inputDir);
    if (!p.isDirectory()) {
        error(`附加数据的配置文件夹有误：${inputDir}`);
        return;
    }
    let lines: string[] = [`${hasNamespace ? "export " : ""}interface ExtraData {`];
    let modules: string[] = [(hasNamespace ? "" : "declare ") + `namespace ExtraData {`];
    let flist = fs.readdirSync(inputDir);
    let readonly = "readonly ";

    flist.forEach(file => {
        let re = path.parse(file);
        if (re.ext != Ext.Json) {
            return;
        }
        let data: ExtraBin[] = getData(path.join(inputDir, file));
        if (data != undefined) {
            let name = re.name;
            lines.push(`\t${readonly}${name}: ExtraData.${name};`);
            modules.push(`\texport interface ${name} {`);
            data.forEach(bin => {
                let desc = bin.desc;
                if (desc) {
                    modules.push(`\t\t/**`);
                    let descs = desc.split(/\r\n/);
                    descs.forEach(line => {
                        modules.push(`\t\t * ${line}  `);
                    });
                    modules.push(`\t\t */`);
                }
                modules.push(`\t\t${readonly}${bin.key}: ${bin.type};`);
            });
            modules.push(`\t}`);
        }
    });
    modules.push(`}`);
    lines.push(`}`);
    modules.forEach(line => { lines.push(line) });
    if (hasNamespace) {
        for (let i = lines.length; i > 0; i--) {
            lines[i] = "\t" + lines[i - 1];
        }
        lines[0] = `declare namespace jy {`;
        lines[lines.length] = `}`;
    }
    let out = lines.join("\n");
    // 尝试存储文件
    saveCodeFile(codePath, "", out, "ExtraData", Ext.ClientDefine);
    return out;
    function getData(file: string, err = "") {
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            console.error(`找不到文件${file}`);
            return;
        }
        console.log(`getData ${file}`);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch (e) {
            error(`解析${err}数据，${file}时出错`, e);
        }
        return data;
    }
}

/**
 * 检查属性名称
 * @param {string}  name    属性名称
 * @param {GlobalCfg}   gcfg    配置信息
 * @param {string}  [errPrefix=""]   报错前缀
 * @returns {string} 错误内容
 */
function checkProName(name: string, gcfg: GlobalCfg, errPrefix = "") {
    if (!/[a-z][a-zA-Z0-9_]*/.test(name)) {
        return `${errPrefix}属性名字不符合规范：首字母必须小写(a-z)，只能使用字母(a-z A-Z)或者数字(0-9)及下划线(_)`;
    }
    const keywords = gcfg.keywords;
    for (let key in keywords) {
        let keys = keywords[key];
        if (Array.isArray(keys)) {
            if (~keys.indexOf(name)) {
                return `${errPrefix}属性名字[${name}]不能为${key}的关键字`;
            }
        }
    }
}

async function solveCheck(url: string, desc: string, pData?: any) {
    let content = await postHttpData(url, pData);
    if (content) {
        let result: PreCheckResponse;
        try {
            result = JSON.parse(content);
        } catch (e) {
            throw Error(`执行${desc}[${url}]有误,${e.message}`);
        }
        if (result) {
            const { type, msg } = result;
            switch (type) {
                case PreCheckResponseType.Success:
                    break;
                case PreCheckResponseType.Warn:
                    error(msg);
                    break;
                case PreCheckResponseType.Error:
                    alert(msg);
                    throw Error(`执行${desc}[${url}]发现问题,${msg}`);
            }
        }
    }
}
/**
 * 获取http数据
 * 
 * @param {string} url 要获取数据的地址
 * @param {any} post 要提交的数据
 * @returns {Promise}
 */
function postHttpData(url: string, post?: any) {
    return new Promise<string>((resolve, reject) => {
        let http: typeof import("http") = nodeRequire("http");
        let URL: typeof import("url") = nodeRequire("url");
        let opt = (<any>URL.parse(url)) as import("http").RequestOptions;
        let postData = post ? JSON.stringify(post) : "";
        opt.headers = {
            'Content-Type': 'text/json',
            'Content-Length': Buffer.byteLength(postData)
        };
        opt.method = "post";
        let req = http.request(opt, res => {
            let size = 0;
            let chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
                size += chunk.length;
                chunks.push(chunk);
            });
            res.on("end", () => {
                let data = Buffer.concat(chunks, size);
                resolve(data.toString("utf8"));
            });
        });
        req.on("error", (err) => {
            reject(err);
        });
        req.write(postData);
        req.end();
    });
}

function getJavaName(name: string) {
    return name[0].toUpperCase() + name.substr(1);
}