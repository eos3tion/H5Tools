function execute(data: IPluginData, callback: IPluginCallback) {
    let list = data.rawData;
    // 检查第一行
    let cfg = {
        code: 1,//默认第一列
        msg: 2//默认第二列
    }
    let title: any[] = list[data.rowCfg["nameRow"]];
    let KeyFlag = 0;
    for (let col = 0, len = title.length; col <= len; col++) {
        let cell = title[col];
        if (cell) {
            cell = cell.trim();
        }
        if (cell == "code") {
            cfg.code = col;
            KeyFlag |= 0b1;
        } else if (cell == "msg") {
            cfg.msg = col;
            KeyFlag |= 0b10;
        }
    }
    if (KeyFlag != 0b11) {
        callback({ err: Error(`code码表中第一列必须有抬头"code"和"msg"`) });
        return;
    }
    let msgDict = {};
    // 去掉第一行说明
    for (let i = data.dataRowStart, len = list.length; i < len; i++) {
        let rowData = list[i];
        msgDict[rowData[cfg.code]] = rowData[cfg.msg];
    }
    // 存储文件
    let output = "";
    let dat = JSON.stringify(msgDict);
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
    for (let msgCode of msgCodes) {
        let { type, path: fullPath } = msgCode;
        if (type == "js") {
            dat = "var $lang=" + dat.replace(/"([^"^'^-]+?)":"(.+?)"(,?)/g, "$1:\"$2\"$3");
        }
        let dir = path.dirname(fullPath);
        // 检查文件夹
        if (fs.existsSync(path.dirname(dir))) {
            fs.writeFileSync(fullPath, dat, "utf8");
            output += `<font color="#0c0">生成${fullPath}</font>`;
        } else {
            output += `没有文件夹${dir}，`
        }
    }
    callback({ output });
}