/**
 * 配置的类型
 */
declare const enum ProType {
    /**
     * 不解析
     */
    None = 0,
    /**
     * 普通属性，会生成定义
     */
    Common = 1,
    /**
     * 为局部数据，不会生成定义，由客户端自行解析
     */
    Local = 2,
    /**
     * 数据会打包成JSON字符串存在服务端
     */
    ServerWithJSON = 3,
}

/**
 * 全局配置
 */
interface GlobalCfg {
    /**
     * 项目语言
     * 
     * @type {string}
     * @memberOf GlobalCfg
     */
    lan?: string;
    /**
     * 分支版本
     */
    version?: string;
    /**
     * 远程的配置路径
     * 
     * @type {string}
     */
    remote?: string;
    /**
     * 原始配置
     * 
     * @type {string}
     * @memberOf GlobalCfg
     */
    origin?: string;
    /**
     * 替换器
     * 
     * @type {{[index:string]:string}}
     * @memberOf GlobalCfg
     */
    replacer?: { [index: string]: string };
    /**
     * 项目名称
     * 
     * @type {string}
     */
    project: string;

    /**
     * 客户端模块名称
     * 
     * @type {string}
     * @memberof GlobalCfg
     */
    clientModule: string;
    /**
     * 客户端配置导出路径
     * 
     * @type {string}
     */
    clientPath: string;

    /**
     * 服务端配置导出路径
     * 
     * @type {string}
     */
    serverPath: string;
    /**
     * 服务端附加数据的打包文件名
     * 
     * @type {string}
     * @memberOf GlobalCfg
     */
    serverExtra: string;
    /**
     * 服务端用于注册常量和引用的类
     *  ///ts:import=DataLocator
        import DataLocator = require('./junyou/common/configs/DataLocator'); ///ts:import:generated
     *  ///ts:import=SkillCfg
        import SkillCfg = require('./huaqiangu/battle/skills/SkillCfg'); ///ts:import:generated
        var ConfigKey = {
             /**
             * 技能模板表
             */
    /*      JiNengMoBan: "JiNengMoBan"
       }
       // 注册常规解析器
       DataLocator.regCommonParser(ConfigKey.JiNengMoBan; JiNengMoBanCfg);

       export = ConfigKey;
    * @type {string}
    */
    serverRegClass?: [string, string];

    /**
     * 客户端用于注册常量和引用的类
     * 
     * @type {string}
     */
    clientRegClass?: [string, string];
    /**
     * 
     * 执行完成后调用的脚本
     * @type {string}
     */
    endScript?: string;

    /**
     * 
     * 执行完成后调用的url
     * @type {string}
     */
    endAction?: string;

    /**
     * 客户端预检测的http地址  
     * 如果配置此值，解析配置后，会先将解析到的数据，以及配置信息，向这个请求进行验证  
     * 验证成功后，等待服务器发送返回  
     * {PreCheckResponse} 类型的信息  
     * 如果返回错误，将不再执行后续处理  
     */
    clientPreCheck?: string;

    /**
     * 服务端预检测的http地址  
     * 如果配置此值，解析配置后，会先将解析到的数据，以及配置信息，向这个请求进行验证  
     * 验证成功后，等待服务器发送返回  
     * {PreCheckResponse} 类型的信息  
     * 如果返回错误，将不再执行后续处理  
     * 详情参考：http://192.168.0.205:1234/h5Tools/DataTools/issues/8  
     */
    serverPreCheck?: string;
    /**
     * 服务端最终检测的http地址  
     * 当配置文件生成后，想服务端发起请求
     * {PreCheckResponse} 类型的信息  
     */
    serverEndCheck?: string;
    /**
     * 服务端最终检测的http地址  
     * 当配置文件生成后，想服务端发起请求
     * {PreCheckResponse} 类型的信息  
     */
    clientEndCheck?: string;
    /**
     * 语言用关键字，禁止`属性名称`使用的字符串  
     * Key  {string}    语言说明，如"AS3关键字"，"java关键字"，"typescript关键字"  
     * Value {string[]} 关键字列表  
     * ```json
     * {
     *      //...其他配置
     *      "keywords": {
     *          "客户端关键字": ["var",/*...其他关键字...* /"int"],
     *          "服务端关键字": ["long",/*...其他关键字...* /"double"]
     *      }
     *      //...其他配置
     * }
     * ```
     * 
     * 详情参考： http://192.168.0.205:1234/h5Tools/DataTools/issues/9
     */
    keywords?: { [index: string]: string[] };

    /**
     * 服务器是否导出全部数据
     * 
     * @type {boolean}
     * @memberOf GlobalCfg
     */
    serverExportAll?: boolean;

    /**
     * 服务端数据类型
     */
    serverDataType?: ServerDataType;

    /**
     * 客户端数据类型  
     * 0/undefined 使用JSON  
     * 1 使用 PBBinary
     */
    clientDataType?: ClientDataType;

    /**
     * code码的配置
     */
    msgCode: MsgCodeCfg[];

    /**
     * 条件表配置路径  
     * JSON数据
     */
    tiaojian?: string;

    /**
     * 支持的条件函数  
     * 所有函数都会将函数名转换成小写字符串
     */
    tiaojianFuncs?: string[]

    /**
     * 国际化数据源  
     * **`0或者不配置`**  使用客户端导出字段  
     * **`1`** 使用服务端导出字段  
     */
    g11nSource?: number;
}

interface FileConfig {
    /**
     * 客户端包名
     */
    cfilePackage: string;
    /**
     * 服务端包名
     */
    sfilePackage: string;
    /**
     * 客户端基类
     */
    cSuper: string;
    /**
     * 服务端基类
     */
    sSuper: string;
    /**
     * 客户端接口列表
     */
    cInterfaces: string[];
    /**
     * 服务端接口列表
     */
    sInterfaces: string[];
    /**
     * 客户端主键
     */
    clientMainKey: string;
    /**
     * 客户端数据集类型
     */
    cTableType: number;
    /**
     * 客户端实例类型
     */
    cInstanceType: number;
    /**
     * 客户端指定的行范围
     */
    cLineRange: { 0: number, 1: number }[];
    /**
     * 加载的配置的文件名称
     */
    name: string;
    /**
     * 加载配置的文件路径
     */
    path: string;
    /**
     * 客户端代码导出路径
     */
    cPath: string;
    /**
     * 服务端代码导出路径
     */
    sPath: string;
}

interface MsgCodeCfg {
    type: string;
    path?: string;
}

declare const enum ClientDataType {
    Json = 0,
    PBBin = 1,
}

declare const enum ServerDataType {
    Json = 0,
    Jat = 1,
}

interface PreCheckResponse {
    /**
     * 0 解析正常  
     * 1 警告  
     * 2 出错，需要立即停止
     */
    type: PreCheckResponseType;
    /**
     * 错误提示
     */
    msg: string;
}

declare const enum PreCheckResponseType {
    /**
     * 解析正常  
     */
    Success = 0,
    /**
     * 警告
     */
    Warn = 1,
    /**
     * 出错，需要立即停止
     */
    Error = 2
}

/**
 * 属性定义
 */
interface ProDefine {

    /**
     * 属性名称
     * 
     * @type {string}
     */
    name: string;

    /**
     * 描述
     * 
     * @type {string}
     */
    desc: string;

    /**
     * 默认值
     * 
     * @type {*}
     */
    def: any;

    /**
     * 列的数据
     * 
     * @type {number}
     * @memberOf ProDefine
     */
    dataRows: Map<number, any>;

    /**
     * 是否导出客户端数据
     * 0 不解析
     * 1 解析，并在代码生成时，生成类型对应的字段
     * 2 解析，生成代码时，在decode方法中，由临时变量记录数据，不生成方法
     * 
     * @type {number}
     */
    client: ProType;

    /**
     * 是否导出服务端数据
     * 0 不解析
     * 1 解析，并在代码生成时，生成类型对应的字段
     * 2 解析，生成代码时，在decode方法中，由临时变量记录数据，不生成方法
     * @type {number}
     */
    server: ProType;

    /**
     * 数据类型检查器
     * 
     * @type {TypeChecker}
     */
    checker: TypeChecker;
}

/**
 * 检查数据是否符合类型，否则抛错
 * 
 * @interface TypeChecker
 */
interface TypeChecker {

    readonly type: string;
    /**
     * java类型
     * 
     * @type {string}
     * @memberOf TypeChecker
     */
    readonly javaType: string;
    /**
     * ue的c++类型
     */
    readonly ueType: string;
    /**
     * 
     * 类型索引值
     * @type {number}
     */
    readonly idx: number;

    /**
     * 导出JSON时，用的默认值，用于数据占位
     * 使用精简，但是可以通过数据类型进行识别的占位符
     * @type {*}
     * @memberOf TypeChecker
     */
    readonly jsonDef?: any;
    /**
     * 默认值
     * 此数据类型如果不赋值时，最终的值
     * @type {*}
     * @memberOf TypeChecker
     */
    readonly def: any;
    /**
     * 检查并返回处理后的数据
     * 
     * @param {string} value 待处理的数据
     * @returns {any} 
     * @throw {ValueTypeError}
     */
    check(value: string): any;

    serverCheck(value: string): any;
    /**
     * 获取导出的数据
     * 
     * @param {*} v         当前数据
     * @param {*} def      此列默认值
     * @returns {*} 
     * 
     * @memberOf TypeChecker
     */
    getOutValue(v: any, def: any): any;

    /**
     * 是否为特殊字符串，需要转义
     */
    solveString?: boolean;

}

interface IPluginData {
    gcfg: GlobalCfg;
    /**
     * 文件名
     * @type {string}
     */
    filename: string;
    /**原始数据 */
    rawData: any[];
    /**服务器数据 */
    sdatas: any[];
    /**客户端数据 */
    cdatas: any[];
    /**
     * 
     * 列定义
     * @type {ProDefine[]}
     */
    defines: ProDefine[];
    /**
     * 
     * 数据起始行
     * @type {number}
     */
    dataRowStart: number;

    /**
     * 行配置对应的行数
     * Key  {string}    配置名称     
            "程序配置内容": "cfgRow";
            "前端解析": "clientRow";
            "后端解析": "serverRow";
            "默认值": "defaultRow";
            "数据类型": "typeRow";
            "描述": "desRow";
            "属性名称": "nameRow"

       Value {number}   行号
     * 
     * @type {{ [index: string]: number }}
     */
    rowCfg: { [index: string]: number };

    /**
     * key-value类型的原始数据，用于插件调用
     * 
     * @type {Object[]}
     * @memberOf IPluginData
     */
    pluginData: Object[];

    /**
     * 插件参数
     * 
     * @type {*}
     * @memberOf IPluginData
     */
    pluginParams: any;

    /**
     * 客户端生成根目录
     * 
     * @type {string}
     * @memberOf RuntimeCfgs
     */
    cPath: string;
    /**
     * 
     * 服务端生成根目录
     * @type {string}
     * @memberOf RuntimeCfgs
     */
    sPath: string;
    /**
     * 客户端包路径
     */
    cfilePackage?: string;
    /**
     * 服务端包路径
     */
    sfilePackage?: string;
    /**
     * 客户端继承项
     */
    cSuper?: string;
    /**
     * 服务端继承项
     */
    sSuper?: string;
    /**
     * 客户端接口项
     */
    cInterfaces?: string[];
    /**
     * 服务端接口项
     */
    sInterfaces?: string[];
}

/**
 * 
 * 插件回调
 * @interface IPluginCallback
 */
interface IPluginCallback {

    /**
     * 
     * 
     * @param {Error} [err]           错误信息
     * @param {string} [output]     输出的字符串
     * @param {any[]} [sdatas]      处理后的服务端数据
     * @param {any[]} [cdatas]      处理后的客户端数据
     */
    (opt: PluginCallbackOption): void
}

interface PluginCallbackOption {
    /**
     * 是否可以使用 writeCommonBinData 写数据
     */
    makeBin?: boolean;
    /**
     * 错误信息
     */
    err?: Error;
    /**
     * 输出字符串
     */
    output?: string;
    /**
     * 处理后的服务端数据
     */
    sdatas?: any[];
    /**
     * 处理后的客户端数据
     */
    cdatas?: any[];
}

/**
 * 
 * 插件定义
 * @interface IPlugin
 */
interface IPlugin {

    /**
     * 
     * 运行插件
     * @param {IPluginData} data
     * @param {IPluginCallback} callback
     */
    execute(data: IPluginData, callback: IPluginCallback);
}

interface IPluginLoaderCallback extends PluginCallbackOption {
    type: string;
    error?: number;
}

interface ConfigKeyBin {
    fname: string;
    hasExtra?: boolean;
    isClass?: boolean;
    mainKey?: string;

    /**
     * 类型
     * 
     * @type {CfgDataType}
     * @memberof ConfigKeyBin
     */
    type: CfgDataType;
}

/**
 * 公共数据的条目数据
 * 
 * @interface ExtraBin
 */
interface ExtraBin {
    key: string;
    value: string;
    desc: string;
    type: string;
}

/**
 * 数据头信息的类型
 * 
 * @enum {number}
 */
declare const enum HeadItemType {
    /**
     * 有数据，并且是全局
     */
    HasData = 0b1,
    Local = 0b10,
    /**
     * 没有数据
     */
    NoData = 0,
    /**
     * 局部变量并且没有数据
     */
    LocalnoData = Local,
    /**
     * 局部变量有数据
     */
    LocalhasData = Local | HasData
}

/**
 * 头信息
 * 
 * @interface HeadItem
 * @extends {Array<any>}
 */
interface HeadItem extends Array<any> {
    /**
    * 属性的名称
    * 
    * @type {string}
    * @memberOf HeadItem
    */
    0: string;
    /**
    * 数值的数据类型
    * 
    * @type {number}
    * @memberOf HeadItem
    */
    1: TypeCheckerIndex;
    /**
    * 此列是否有数据
    * 
    * @type {HeadItemType}
    * @memberOf HeadItem
    */
    2?: HeadItemType;
    /**
    * 默认值
    * 
    * @type {*}
    * @memberOf HeadItem
    */
    3?: any;
}
/**
  * 表单最终被解析成的类型
  * 
  * @export
  * @enum {number}
  */
declare const enum CfgDataType {
    /**
     * 自动解析
     */
    Auto = 0,
    /**
     * 按ArraySet解析
     */
    ArraySet = 1,
    /**
     * 按数组解析
     */
    Array = 2,
    /**
     * 按字典解析
     */
    Dictionary = 3
}

declare const enum CfgInstanceType {
    /**
     * 自动判断
     */
    Auto = 0,

    /**
     * 是类
     */
    Class = 1,

    /**
     * 是接口
     */
    Interface = 2
}

/**
 * 类型检查器的索引
 * 
 * @enum {number}
 */
declare const enum TypeCheckerIndex {
    Any = 0,
    String = 1,
    Number = 2,
    Bool = 3,
    Array = 4,
    Array2D = 5,
    Date = 6,
    Time = 7,
    DateTime = 8,
    Int32 = 9,
    Condition = 10,
}


declare const enum TypeCheckerKey {
    Any = "",
    Number = "number",

    String = "string",

    Bool = "boolean",

    Array1 = "|",

    Array2 = ":",

    Array2D = "|:",

    Date = "yyyy-MM-dd",

    Time = "HH:mm",

    DateTime = "yyyy-MM-dd HH:mm",

    Int = "int",

    LingYuArray = "lingyuArray",
    /**
     * 条件
     */
    Condition = "tiaojian",
}

declare type Key = string | number;


declare const enum PBType {
    Double = 1,
    Float,
    Int64,
    UInt64,
    Int32,
    Fixed64,
    Fixed32,
    Bool,
    String,
    Group,
    Message,
    Bytes,
    Uint32,
    Enum,
    SFixed32,
    SFixed64,
    SInt32,
    SInt64
}

/**
 * protobuf2 的字段类型
 * 
 * @export
 * @enum {number}
 */
declare const enum PBFieldType {
    Optional = 1,
    Required,
    Repeated
}

/**
 * 单个Field的结构
 * 
 * @interface PBField
 */
interface PBField extends Array<any> {
    /**
     * 
     * 必有 属性名字
     * @type {Key}
     */
    0: Key;
    /**
     * 
     * 必有 required optional repeated
     * @type {PBFieldType}
     */
    1: PBFieldType;
    /**
     * 
     * 必有 数据类型
     * @type {number}
     */
    2: number;
    /**
     * 
     * 可选 消息类型名称
     * @type {(Key | PBStruct)}
     * @memberOf PBField
     */
    3?: Key | PBStruct;
    /**
     * 可选 默认值
     * 
     * @type {*}
     */
    4?: any;
}

/**
 * 单条消息的定义
 * 
 * @interface PBStruct
 */
interface PBStruct {
    /**索引 */
    [index: number]: PBField;
    /**
     * 有默认值的key
     * 
     * @type {any}
     * @memberOf PBStruct
     */
    def?: any;
}

/**
 * PB结构字典
 * 
 * @interface PBStructDict
 */
declare type PBStructDict = {
    [index: string]: PBStruct;
}

interface PBStructDictInput {
    /**
     * 是否初始化过
     * 
     * @type {*}
     * @memberOf PBStructDict
     */
    $$inted?: any;
    [index: string]: PBStruct | Key;
}

declare const enum Ext {
    Json = ".json",

    Bin = ".bin",

    /**
     * 客户端代码文件 .ts
     */
    ClientCode = ".ts",
    /**
     * 客户端代码文件 .d.ts
     */
    ClientDefine = ".d.ts",
    /**
     * 服务端数据文件 .jat
     */
    ServerData = ".jat",
    /**
     * 服务端代码文件 .java
     */
    ServerCode = ".java",

    /**
     * UE头文件
     */
    CStructHead = ".h",
}

declare const enum SheetNames {
    /**
     * 正常数据内容，列表数据
     */
    Main = "导出",
    /**
     * 附加数据，用于代替之前公共数据表功能
     * 这样可以将一个模块数据配置在一起
     * 第一列为Key
     * 第二列为Value
     */
    Extra = "附加数据",
    /**
     * 用于配置表的配置  
     * 程序用的一些配置
     */
    Config = "程序配置",
}

interface CodeFlashResult {
    /**
     * 输出路径
     */
    path: string;
    /**
     * 代码
     */
    code: string;
    /**
     * 包路径
     */
    packagePath: string;
    /**
     * 类名字
     */
    className: string;
}

/**
 * 服务端代码生成器
 */
interface CodeMaker {
    /**
     * 添加要导出的属性定义
     * @param define 
     */
    addProperty(define: ProDefine, checker: TypeChecker, descs: string[]);
    /**
     * 输出字符串
     */
    flash(): CodeFlashResult;
    /**
     * 初始化
     */
    init(fcfg: FileConfig, cfg: GlobalCfg);

    /**
     * 获取扩展名
     */
    getExt(): string;
}


declare var serverCodeMaker: CodeMaker

declare var clientCodeMaker: CodeMaker

/**
 * 文件后缀
 */
declare const enum Suffix {
    Client = "Cfg",
    Server = "Config"
}

declare var XLSX: typeof import("xlsx");