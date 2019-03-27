var fs = nodeRequire("fs");
/**
 * 手写代码的默认提示
 */
const ManualCodeDefaultComment = {
	/**
	 * 类上方提示
	 */
    $area1: "//这里填写类上方的手写内容",
	/**
	 * 类中提示
	 */
    $area2: "//这里填写类里面的手写内容",
	/**
	 * 类下方提示
	 */
    $area3: "//这里填写类下发的手写内容",
    /**
     * 类下方提示
     */
    $area4: "//这里填写类下发的手写内容",
    /**
     * 类下方提示
     */
    $area5: "//这里填写类下发的手写内容",
	/**
	 * 处理函数提示
	 */
    $decode: "//这里填写方法中的手写内容",
    /**
	 * 处理函数提示
	 */
    $cdata: "//这里填写方法中的手写内容",
}

/**
 * 是否有区域代码
 * 
 * @param {string} key
 * @param {{ [index: string]: string }} cinfo
 * @returns
 */
function hasManualAreaCode(key: string, cinfo: { [index: string]: string }) {
    let manual = cinfo[key];
    return manual && manual.trim() != ManualCodeDefaultComment[key];
}

/**
 * 获取代码区域中的内容
 * 
 * @param {string} key
 * @param {{ [index: string]: string }} cinfo
 * @returns
 */
function getRawManualAreaCode(key: string, cinfo: { [index: string]: string }) {
    let manual = cinfo[key];
    if (manual && manual.trim() != ManualCodeDefaultComment[key]) {
        return manual;
    }
}

/**
 * 生成手动代码区域的文本
 */
function genManualAreaCode(key: string, cinfo: { [index: string]: string }, indent = "") {
    let manual = cinfo[key];
    if (!manual) {
        if (key in ManualCodeDefaultComment) {
            manual = "\n" + indent + ManualCodeDefaultComment[key];
        } else {
            throw Error(`错误的区域标识${key}`);
        }
    }
    return `/*-*begin ${key}*-*/${manual}
${indent}/*-*end ${key}*-*/`
}

/**
 * 获取手动写的代码信息
 */
function getManualCodeInfo(files: string[]) {
    let dict: { [index: string]: string } = {};
    files.forEach(file => {
        if (fs.existsSync(file)) {
            //读取文件内容
            let content = fs.readFileSync(file, "utf8");
            //找到手写内容
            let reg = /[/][*]-[*]begin[ ]([$]?[a-zA-Z0-9]+)[*]-[*][/]([^]*?)\s+[/][*]-[*]end[ ]\1[*]-[*][/]/g
            while (true) {
                let result = reg.exec(content);
                if (result) {
                    let key = result[1];
                    let manual = result[2];
                    if (!manual.trim()) {//没有注释
                        continue;
                    } else if (key in ManualCodeDefaultComment) {
                        if (ManualCodeDefaultComment[key] == manual) {//类上中下的注释
                            continue;
                        }
                    }
                    dict[key] = manual;
                } else {
                    break;
                }
            }
        }
    })
    return dict;
}

export { genManualAreaCode, getManualCodeInfo, ManualCodeDefaultComment, hasManualAreaCode, getRawManualAreaCode }