const enum Const {
    MsgKeyPrefix = "msg_",
}
function execute(data: IPluginData, callback: IPluginCallback) {
    let list = data.rawData;
    // 检查第一行
    let cfg = {
        code: 1,//默认第一列
        msg: 2//默认第二列
    }
    let title: any[] = list[data.rowCfg["nameRow"]];
    let KeyFlag = 0;
    /**
     * 用于处理其他语言
     */
    let otherMsgKeys = [] as string[];
    for (let col = 0, len = title.length; col <= len; col++) {
        let cell = title[col] as string;
        if (cell) {
            cell = cell.trim();
        }
        if (cell == "code") {
            cfg.code = col;
            KeyFlag |= 0b1;
        } else if (cell == "msg") {
            cfg.msg = col;
            KeyFlag |= 0b10;
        } else if (cell.startsWith(Const.MsgKeyPrefix)) {//多语言
            otherMsgKeys.push(cell);
        }
    }
    if (KeyFlag != 0b11) {
        callback({ err: Error(`code码表中第一列必须有抬头"code"和"msg"`) });
        return;
    }
    let msgDict = {} as { [code: string]: string };
    const otherDict = {} as { [lan: string]: { [code: string]: string } }
    for (let i = 0; i < otherMsgKeys.length; i++) {
        const key = otherMsgKeys[i];
        otherDict[key] = {};
    }
    // 去掉第一行说明
    for (let i = data.dataRowStart, len = list.length; i < len; i++) {
        let rowData = list[i];
        const { code, msg } = cfg;
        msgDict[rowData[code]] = rowData[msg];
        for (let j = 0; j < otherMsgKeys.length; j++) {
            const key = otherMsgKeys[j];
            const lanMsg = cfg[key];
            if (lanMsg != undefined) {
                otherDict[key][code] = lanMsg;
            }
        }
    }


    let gcfg = data.gcfg;
    const path: typeof import("path") = require("path");
    const fs = require("fs");
    let msgCodes = gcfg.msgCode;
    if (!msgCodes) {
        msgCodes = [{
            type: "js",
            path: path.join(gcfg.clientPath, "lang.js"),
        }]
    }
    const filename = data.filename;
    const p = path.basename(filename, ".xlsx");
    const plusD = p.split("_");
    let v = "";
    if (plusD.length == 2) {
        v = "_" + plusD[1];
    }
    // 存储文件
    let output = "";
    const prefixStartIdx = Const.MsgKeyPrefix.length;
    for (let msgCode of msgCodes) {
        let { type, path: fullPath } = msgCode;
        let file = fullPath.replace("{v}", "");
        output += writeFile(msgDict, type, file, path, fs);
        for (let key in otherDict) {
            const dict = otherDict[key];
            let file = fullPath.replace("{v}", key.substring(prefixStartIdx));
            output += writeFile(dict, type, file, path, fs);
        }
    }
    callback({ output });
}
function writeFile(msgDict: any, type: string, fullPath: string, path: typeof import("path"), fs: typeof import("fs")) {
    let output: string
    let dat = JSON.stringify(msgDict);
    if (type == "js") {
        dat = "var $lang=" + dat.replace(/"([^"^'^-]+?)":"(.+?)"(,?)/g, "$1:\"$2\"$3");
    }
    let dir = path.dirname(fullPath);
    // 检查文件夹
    if (fs.existsSync(path.dirname(dir))) {
        fs.writeFileSync(fullPath, dat, "utf8");
        output = `<font color="#0c0">生成${fullPath}</font>\n`;
    } else {
        output = `没有文件夹${dir}\n`
    }
    return output
}