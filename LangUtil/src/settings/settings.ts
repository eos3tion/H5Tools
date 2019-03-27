export default {
    ts: {
        ext: ".ts",
        modReg: `^\/\/@code@([^@]+)@`,
        iHead: 1,
        iMsg: 2,
        iRest: 3,
        filterStr: "(LangUtil[.]getMsg|TipUtil[.]client|TipUtil[.]server)[(]`((?![$]_).*?)`(.*?)[)]",
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