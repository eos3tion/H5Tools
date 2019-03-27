/// <reference path="xlsx/xlsx.d.ts" />
/// <reference path="node/index.d.ts" />
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

declare function ready(hander: () => void);
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

declare namespace hljs {
    export function loadLanguage(language: string);
}