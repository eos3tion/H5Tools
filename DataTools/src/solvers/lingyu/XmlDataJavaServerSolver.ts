const fs: typeof import("fs") = nodeRequire("fs");
const path: typeof import("path") = nodeRequire("path");
/**
 * 处理数据
 * 
 * @param {*} data 
 * @returns {string} 
 */
function saveData(data: any[], fname: string, url: string): string {
    let ret: string = `<?xml version="1.0" encoding="UTF-8"?>\r\n<root>\r\n`;
    ret += `<${fname}>\r\n`;
    for (let i = 0; i < data.length; i++) {
        let dat = data[i];
        if (Object.keys(dat).length) {
            ret += `\t<entry `;
            for (let key2 in dat) {
                ret += ` ${key2}="${xmlEncode(dat[key2].toString())}" `;
            }
            ret += ` />\r\n`;
        }
    }
    ret += `</${fname}>\r\n`;
    ret += `</root>`;

    if (fs.existsSync(url)) {
        let spath = path.join(url, fname + ".xml");
        //检查文件夹是否存在
        fs.writeFileSync(spath, ret);
        return spath;
    } else {
        throw `xml版配置路径：${url}不存在，请自行创建`;
    }
}


const escChars = {
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "\'": "&apos;",
    "&": "&amp;",
};

function xmlEncode(content) {
    return content.replace(/<|>|"|'|&/g, substring => {
        return escChars[substring];
    });
}

export { saveData };