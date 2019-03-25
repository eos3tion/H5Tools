export default {
    as3: {
        ext: ".as",
        modReg: `^\/\/@code@([^@]+)@`,
        iHead: 1,
        iMsg: 3,
        iRest: 4,
        filterStr: `(RFMessage.getMessage|RFMessage.getRealMessage|UILocator.showClientCode|UILocator.showServerCode)[(]("|')((?![$]_).*?)\\2(.*?)[)]`,
        templateHandler: (msg: string, node: RepItem) => {
            let head = node.head;
            if (/RFMessage.getMessage|RFMessage.getRealMessage/.test(node.head)) {
                head = `RFMessage.getMessage`;
            }
            return `${head}(${msg})`;
        },
        constCfg: {
            file: `MsgCodeConst.as`,
            head: [
                `package`,
                `{`,
                `\tpublic class MsgCodeConst`,
                `\t{`
            ],
            main: [
                `\t\t/**`,
                `\t\t * {msg}`,
                `\t\t */`,
                `\t\tpublic static const {code} = {code}`
            ],
            tail: [
                `\t}`,
                `}`
            ],
            getKey(code) {
                return `MsgCodeConst.{0}`.substitute(this.getCode(code));
            },
            getCode(code) {
                if (code != +code) {//有字符串，替换掉非法字符
                    code = code.replace(/[^a-zA-Z$_0-9]/g, "_");
                }
                return `Code_{0}`.substitute(code);
            }
        }
    },
    ts: {
        ext: ".ts",
        modReg: `^\/\/@code@([^@]+)@`,
        iHead: 1,
        iMsg: 2,
        iRest: 3,
        filterStr: "(LangUtil.getMsg|CoreFunction.showClientTips|CoreFunction.showServerTips)[(]`((?![$]_).*?)`(.*?)[)]",
        templateHandler: (msg: string, node: RepItem) => {
            return `${node.head}(${msg})`;
        },
        constCfg: {
            file: `MsgCodeConst.d.ts`,
            head: [`declare const enum MsgCodeConst {`],
            main: [
                `\t/**`,
                `\t * {msg}`,
                `\t */`,
                `\t{code} = {codeValue},`
            ],
            tail: [`}`],
            getKey(code) {
                return `MsgCodeConst.{0}`.substitute(this.getCode(code));
            },
            getCode(code) {
                code += "";
                code = code.replace(/[^a-zA-Z$_0-9]/g, "_");//替换掉非法字符
                return `Code_{0}`.substitute(code);
            }
        }
    }
}