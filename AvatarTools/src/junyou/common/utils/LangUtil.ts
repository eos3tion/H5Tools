module junyou {

    /**
     * 用于处理语言/文字显示
     */
    export class LangUtil {

        private static _msgDict: { [index: string]: string };

        /**
         * 获取显示的信息
         * 
         * @static
         * @param {(number | string)} code code码
         * @param args 其他参数  替换字符串中{0}{1}{2}{a} {b}这样的数据，用obj对应key替换，或者是数组中对应key的数据替换
         * @returns 显示信息
         */
        public static getMsg(code: number | string, ...args) {
            if (code in this._msgDict) {
                return this._msgDict[code].substitute(args)
            }
        }
    }
}