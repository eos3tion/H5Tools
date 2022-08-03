
/**
 * Excel一行的数据
 * 
 * @interface ExcelRow
 */
interface ExcelRow extends Array<any> {
    /**
     * 行号
     * 
     * @type {number}
     * @memberOf ExcelRow
     */
    __rowNum__: number,
    /**
     * 用于存储标识 CodeGroup
     * 
     * @type {string}
     * @memberOf ExcelRow
     */
    0?: string,
    /**
     * msgCode的code列
     * 
     * @type {(string | number)}
     * @memberOf ExcelRow
     */
    1?: string | number,
    /**
     * msgCode的msg列
     * 
     * @type {string}
     * @memberOf ExcelRow
     */
    2?: string,
    /**
     * 用于存储code所在文件，用于查询
     * 
     * @type {string}
     * @memberOf ExcelRow
     */
    3?: string;
    /**
    * 所属模块
    * 
    * @type {string}
    * @memberOf ExcelRow
    */
    4?: string;

    [idx: number]: string | number;
}

/**
 * 单个数据对象
 * 
 * @interface DataItem
 */
interface DataItem {
    /**
     * 消息的code码
     * 
     * @type {string | number}
     * @memberof DataItem
     */
    code: string | number;
    /**
     * 消息内容
     * 
     * @type {string}
     * @memberof DataItem
     */
    msg: string;
    /**
     * 消息所属模块
     * 
     * @type {string}
     * @memberof DataItem
     */
    module?: string;
    /**
     * 对应文件来源
     * 
     * @type {string}
     * @memberof DataItem
     */
    path?: string;

    /**
     * 原始数据
     */
    raw: ExcelRow;
}

interface DataModule extends Array<DataItem> {
    /**
     * 模块名称
     * 
     * @type {string}
     * @memberof DataModule
     */
    module: string;
}

/**
 * 数据输入输出
 */
interface DataBaseParser {
    getData(url: string): Promise<Map<string, DataModule>> | Map<string, DataModule>;
    setData(url: string, datas: Map<string, DataModule>): Promise<void> | void;
}

interface LoggerC {
    log(msg: string, color?: string);
    error(msg: string, err?: Error);
}
declare var Logger: LoggerC;

/**
 * 正则表达式分组的索引号  
 * 由于javascript regexp-named-group还只是作为tc39的实验性标准
 * https://github.com/tc39/proposal-regexp-named-groups
 * 所以通过下列索引，进行定位
 * 
 * 如，我们期望将ts文件中，将代码中，类似下面的文本
 * ```typescript
 * LangUtil.getMsg(`测试{0}语言包生成{1}工具` , 1, ture); 
 * ```
 * 进行替换，代码变为
 * ```typescript
 * LangUtil.getMsg(5082 , 1, ture); 
 * ```
 * 而Code.xlsx文件中，有一列  
 * 
 * | 描述     | code码 | 内容 |
 * | --- | --- | --- |
 * | 属性名称 | code   | msg |
 * |         | 5082   | 测试{0}语言包生成{1}工具 |
 * 
 * ```typescript
 * /(LangUtil.getMsg|CoreFunction.showClientTips|CoreFunction.showServerTips)[(]('(?![$]_).*?')(.*?)[)]/g
 * ```
 * 已上述正则表达式为例
 * 
 * head为 `(LangUtil.getMsg|CoreFunction.showClientTips|CoreFunction.showServerTips)` exec 索引号  
 * msg为 `('(?![$]_).*?')` 的 exec 索引号  
 * rest为 最后  `(.*?)` 部分的索引号  
 * @interface RegIndexes
 */
interface SouceFileOpt {
    /**
     * 主替换部分
     * 
     * @type {number}
     * @memberOf RegIndexes
     */
    iHead: number,
    /**
     * 主要替换部分的索引号  
     * 
     * 
     * @type {number}
     * @memberOf RegIndexes
     */
    iMsg: number,
    /**
     * 剩余部分索引号
     * 
     * @type {number}
     * @memberOf RegIndexes
     */
    iRest: number,

    code: number
}

interface Node {
    /**
     * 模块名称
     * 
     * @type {string}
     * @memberof SourceFile
     */
    module: string;
    /**
     * 原始内容
     * 
     * @type {string}
     * @memberOf SourceFile
     */
    raw: string,
    /**
     * 起点
     * 
     * @type {number}
     * @memberOf Node
     */
    pos: number;
    /**
     * 终点
     * 
     * @type {number}
     * @memberOf Node
     */
    end: number;
    /**
     * 需要替换的节点数组
     * 
     * @type {RepItem[]}
     * @memberOf SourceFile
     */
    items?: RepItem[];
    /**
     * 文件路径
     * 
     * @type {string}
     * @memberOf SourceFile
     */
    path: string;
}

/**
 * 源文件
 * 
 * @interface SourceFile
 */
interface SourceFile extends Node {

    /**
     * 相对路径
     * 
     * @type {string}
     * @memberOf SourceFile
     */
    relative: string;

    /**
     * 全部节点
     * 
     * @type {RepItem[]}
     * @memberOf SourceFile
     */
    all: RepItem[];
}


/**
 * 需要替换的项目
 * 
 * @interface RepItem
 */
interface RepItem extends Node {
    /**
     * code码
     * 
     * @type {number | string}
     * @memberOf RepItem
     */
    code: number | string;
    /**
     * 消息内容
     * 
     * @type {string}
     * @memberOf RepItem
     */
    msg: string;

    /**
     * 上级节点
     * 
     * @type {Node}
     * @memberOf RepItem
     */
    parent: Node;

    /**
     * 头部标识
     * 
     * @type {string}
     * @memberOf RepItem
     */
    head: string;

    /**
     * 剩余的内容
     * 
     * @type {string}
     * @memberOf Node
     */
    rest: string;
}

interface Setting {
    /**
     * 适用的文件扩展名
     * 
     * @type {string}
     * @memberof Setting
     */
    ext: string;
    /**
     * 文件中的模块正则字符串
     * 
     * @type {string}
     * @memberof Setting
     */
    modReg: string;

    /**
     * 替换用正则表达式  
     * RFMessage.getMessage(    "test{0}ab{1}cde"       ,param1, param2)  
     * |---------Head-----------|  |------Msg----|       |------Rest-------|
     * @type {string}
     * @memberof Setting
     */
    filterStr: string;
    /**
     * 主替换前缀部分的索引号
     * 
     * @type {number}
     * @memberof Setting
     */
    iHead: number;
    /**
     * 主要替换部分的索引号  
     * 
     * @type {number}
     * @memberof Setting
     */
    iMsg: number;
    /**
     * 剩余部分索引号
     * 
     * @type {number}
     * @memberof Setting
     */
    iRest: number;
    /**
     * 模板函数
     * 
     * @type {{ (msg: string, node: RepItem): string }}
     * @memberof Setting
     */
    templateHandler: { (msg: string, node: RepItem): string };

    /**
     * 常量文件配置
     * 
     * @type {SettingConstConfig}
     * @memberof Setting
     */
    constCfg?: SettingConstConfig;
}

interface SettingConstConfig {
    /**
     * 输出的常量文件，文件名
     * 
     * @type {string}
     * @memberof SettingConstConfig
     */
    file: string;

    /**
     * 常量文件的头部信息  
     * 生成文件时，进行 join("\n")操作
     * 
     * @type {string[]}
     * @memberof SettingConstConfig
     */
    head: string[];

    /**
     * 主题常量值
     * 生成文件时，进行 join("\n")操作
     * @type {string[]}
     * @memberof SettingConstConfig
     */
    main: string[];

    /**
     * 常量文件的尾部信息  
     * 生成文件时，进行 join("\n")操作
     * 
     * @type {string[]}
     * @memberof SettingConstConfig
     */
    tail: string[];

    /**
     * 用于模板字符串中做替换操作
     * 
     * @type {string}
     * @memberof SettingConstConfig
     * @returns {string} 返回替换后的字符串，如果为空，则标识不替换
     */

    getKey(code): string;

    /**
     * 获取code
     * @param code 
     */
    getCode(code): string;
}


/**
 * 内容相同，Code如何处理的选项
 * 
 * @enum {number}
 */
declare const enum SameCodeOpt {
    /**
     * 从不使用相同Code
     */
    Never = 0,
    /**
     * 同一个文件，内容相同，使用相同的Code
     */
    SameFile = 1,
    /**
     * 同一个模块，内容相同，使用相同的Code
     */
    SameModule = 2
}