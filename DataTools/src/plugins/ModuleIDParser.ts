/**
 * 处理模块ID
 * 
 * @param {IPluginData} data
 * @param {IPluginCallback} callback
 */
function execute(data: IPluginData, callback: IPluginCallback) {
    let dat = data.pluginData;
    if (dat) {
        const gcfg = data.gcfg;
        let modName = gcfg.clientModule || `jy.${gcfg.project}`;
        let lines = [`declare namespace ${modName} {`,
            `\texport const enum ModuleId {`];
        for (let item of dat) {
            if ("key" in item && "id" in item) {
                let comment = "";
                if ("name" in item) {
                    comment = item["name"];
                }
                if ("des" in item) {
                    if (comment) {
                        comment += "\n";
                    }
                    comment += item["des"];
                }
                if (comment) {
                    lines.push(`\t\t/**`);
                    let commentLines = comment.split(/\n|\r\n/);
                    commentLines.forEach(cLine => {
                        lines.push(`\t\t * ${cLine}\t`);
                    });
                    lines.push(`\t\t */`);
                }
                lines.push(`\t\t${item["key"]} = ${item["id"]},`);
            }
        }
        lines.push(`\t}`,
            `}`);
        let content = lines.join("\n");
        const path = require("path");
        const fs = require("fs");
        let canWrite = true;
        // 检查原始文件内容      
        let dir = path.join(data.cPath, data.pluginParams || "");
        let fullPath = path.join(dir, "ModuleId.d.ts");
        let output: string;
        let reason: string = "";
        if (fullPath) {
            if (fs.existsSync(fullPath)) {//有原始文件
                let originContent = fs.readFileSync(fullPath, "utf8");
                if (originContent == content) {
                    canWrite = false;
                    output = `<font color="#0c0">${fullPath}文件和内容相同，没有生成</font>`;
                }
            }
        }
        if (canWrite) {
            // 检查文件夹
            if (fs.existsSync(dir)) {
                fs.writeFileSync(fullPath, content, "utf8");
                output = `<font color="#0c0">生成${fullPath}</font>`;
            } else {
                reason = `没有文件夹${dir}，`
            }
        }
        if (!output) {
            output = `${reason}无法成模块${fullPath}`
        }
        callback({ output, sdatas: data.sdatas, cdatas: data.cdatas, makeBin: true });
    }
}