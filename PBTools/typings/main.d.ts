/// <reference path="main/ambient/node/index.d.ts" />
/// <reference path="main/ambient/protobufjs/index.d.ts" />
/// <reference path="globals/highlight.js/index.d.ts" />

interface String {
    /**
     * 替换字符串中{0}{1}{2}{a} {b}这样的数据，用obj对应key替换，或者是数组中对应key的数据替换
     */
    substitute(...args): string;
}
interface Date {
    /**
     * 格式化日期
     */
    format(mask: string): string;
}

declare var nodeRequire: NodeRequire;


interface cookiesUtils {
    /**
    * 设置cookie
    * 
    * @param name 
    * @param value 
    */
    setCookie(name: string, value: string);
    /**
     * 获取cookie
     * 
     * @param name 
     * @returns
     */
    getCookie(name: string);
    /**
    * 删除cookie
    * 
    * @param name
    */
    delCookie(name: string);
}

declare var cookie: cookiesUtils;

interface PinyinConstructor {
    /**
     * 将汉字翻译为拼音，其中每一个字的首字母大写
     * 
     * @param {string} value
     * @returns {string}
     * 
     * @memberOf PinYin
     */
    getFullChars(value: string): string;

    /**
     * 将每一个字的拼音的首字母提取出来，是大写的形式
     * 
     * @param {string} value
     * @returns {string}
     * 
     * @memberOf PinYin
     */
    getCamelChars(value: string): string;

}

declare var Pinyin: PinyinConstructor;

declare namespace hljs {
    export function loadLanguage(language: string);
}
/**
 * 最小化代码，用于比较代码内容是否相同
 * @param {string} code
 */
declare function minifyCode(code: string);