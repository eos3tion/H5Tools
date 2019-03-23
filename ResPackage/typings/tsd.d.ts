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


/**
 * 装箱接口
 */
interface IBlockPacker {

    /**
     * 
     * 如果是需要初始固定一个宽度的装箱处理器，装箱时，设置宽度
     * 固定高度或者宽度没有区别
     */
    setWidth?: (w?: number) => void;

    /**
     * 
     * 处理箱子数据，对blocks进行重新排序，调整block的坐标信息
     * @param {IBlock[]} blocks 
     * @return {IBlock[]} 结果集
     */
    fit(blocks: IBlock[]): IBlock[];
}


/**
 * 装箱的结果
 * 
 * @interface BlocksResult
 */
interface BlocksResult {
    /**
     * 装箱后的总宽度
     * 
     * @type {number}
     * @memberOf BlocksResult
     */
    width?: number;
    /**
     * 装箱后的总高度
     * 
     * @type {number}
     * @memberOf BlocksResult
     */
    height?: number;
    /**
     * 标识
     * 
     * @type {string}
     * @memberOf BlocksResult
     */
    key?: string;
    /**
     * 结果集
     * 
     * @type {IBlock[]}
     * @memberOf BlocksResult
     */
    blocks: IBlock[];
    /**
     * 装箱后的面积
     * 
     * @type {number}
     * @memberOf BlocksResult
     */
    area?: number;
}


/**
 * 用于获取装箱结果
 * 
 * @interface BlocksResultGetter
 */
interface BlocksResultGetter {
    fit(blocks: IBlock[]): BlocksResult;
}

/**
 * 
 * 准备被处理的方块
 * @interface IBlock
 */
interface IBlock {
    w: number;
    h: number;
    getArea(): number;
    clone(): IBlock;
    fit?: Point;
}

interface Point {
    x: number;
    y: number;
}
