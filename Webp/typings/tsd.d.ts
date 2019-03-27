declare var nodeRequire: NodeRequire;
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