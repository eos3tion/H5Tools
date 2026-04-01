
/**
 * 手写代码的默认提示
 */
export const ManualCodeDefaultComment: { [index: string]: string } = {
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
     * onRegister方法中
     */
    $onRegister: "//这里写onRegister中手写内容",
    /**
     * 处理函数提示
     */
    $handler: "//这里填写方法中的手写内容",
    /**
     * 头文件提示
     */
    $header: "//这里填写头文件的手写内容",
}

export function replaceFuncManuals(rep: string, manuals: { [index: string]: string }, indent: string = "") {
    return rep.replace(/[/][*][|]([$_a-zA-Z0-9]+)[|][*][/]/g, (rep, hander) => {
        return `\t` + genManualAreaCode(hander, manuals, `${indent}\t`);
    })
}

/**
 * 生成手动代码区域的文本
 */
export function genManualAreaCode(key: string, cinfo: { [index: string]: string }, indent = "") {
    let manual = cinfo[key];
    if (!manual) {
        if (key in ManualCodeDefaultComment) {
            manual = "\n" + indent + ManualCodeDefaultComment[key];
        } else {
            manual = "\n" + indent + ManualCodeDefaultComment.$handler;
        }
    }
    return `/*-*begin ${key}*-*/${manual}
${indent}/*-*end ${key}*-*/`
}

/**
 * 获取手动写的代码信息
 */
export function getManualCodeInfo(file: string) {
    let manuals: { [index: string]: string } = {};
    /**
     * 注释的字典
     */
    let comments: { [index: string]: string } = {};
    const fs: typeof import("fs") = nodeRequire("fs");
    if (file && fs.existsSync(file)) {
        //读取文件内容
        let content = fs.readFileSync(file, "utf8");

        // /*-*begin $area1*-*/
        // //这里填写类上方的手写内容
        // /*-*end $area1*-*/
        // class XXService{
        // protected handlerName(data:NetData) {
        // 	let msg:className = <className>data.data;
        // 	/*-*begin handlerName*-*/
        // 	//这里填写方法中的手写内容
        // 	/*-*end handlerName*-*/
        // }
        // /*-*begin $area2*-*/
        // //这里填写类里面的手写内容
        // /*-*end $area2*-*/
        // }
        // /*-*begin $area3*-*/
        // //这里填写类下发的手写内容
        // /*-*end $area3*-*/

        // 注释内容
        // /**【xHandler】
        //  *
        //  *
        //  */

        //找到注释内容
        let commentReg = /[/][*][*]【([$]?[a-zA-Z0-9]+)】([^]*?)[*][/]/g;
        while (true) {
            let result = commentReg.exec(content);
            if (result) {
                let comment = result[0];
                let key = result[1];
                comments[key] = comment;
            } else {
                break;
            }
        }
        //找到手写内容
        let reg = /[/][*]-[*]begin[ ]([$]?[a-zA-Z0-9_$]+)[*]-[*][/]([^]*?)\s+[/][*]-[*]end[ ]\1[*]-[*][/]/g
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
                } else {
                    if (ManualCodeDefaultComment.$handler == manual) {//函数注释
                        continue;
                    }
                }
                manuals[key] = manual;
            } else {
                break;
            }
        }
    }
    return { manuals, comments };
}