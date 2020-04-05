
interface ClientCfg {

	/**
	 * 客户端项目路径
	 * 
	 * @type {string}
	 */
	cprefix: string;
	/**
	 * 生成时，使用的wiki地址
	 * 
	 * @type {string}
	 */
	url?: string;

	/**
	 * 
	 * 客户端PB消息字典的文件相对路径
	 * @type {string}
	 */
	PBMsgDictName?: string;

	/**
	 * ServiceName的文件相对路径
	 * 
	 * @type {string}
	 * @memberOf ClientCfg
	 */
	ServiceName?: string;
}

/**
 * 服务器用于生成全部Proto的配置
 * 
 * @interface ServerAllCfg
 */
interface ServerAllCfg {
	/**
	 * 服务端 解析服务的地址
	 * 
	 * @type {string}
	 */
	shttpUrl: string;

	/**
	 * 通信协议列表页的wiki地址
	 * 
	 * @type {string}
	 * @memberOf GlobalCfg
	 */
	wikiAll: string;
}



declare type FieldData = {
	/**
	 * 
	 * 字段名称
	 * @type {string}
	 */
	fieldName: string;
	/**
	 * 
	 * 字段类型
	 * @type {string}
	 */
	fieldType: string;
	/**
	 * 
	 * 是否为消息类型
	 * @type {boolean}
	 */
	isMsg: MsgType;
	/**
	 * 
	 * 用于注册typeScript的类型
	 * @type {(number | string)}
	 */
	tType: number | string;
	/**
	 * 
	 * 是否为repeated
	 * @type {boolean}
	 */
	repeated: boolean;
}


interface ServerReturn {
	result: number;
	alert: string;
	logs: string;
}

/**
 * 指令集
 * 
 * @interface Cmd
 */
interface Cmd {
	name: string;
	type: number | string;
	smodule?: string;
	message?: string;
}


/**
 * 单一的页面内容
 * 
 * @interface Page
 */
interface Page {
	/**
	 * 原始页面名字，一般为中文名字
	 */
	rawName: string;
	/**
	 * 原始内容
	 */
	rawContent: string;

	/**
	 * 文件路径
	 */
	path: string;

	/**
	 * 原始内容提取的proto内容
	 */
	protoContent: string;

	name: string;
	/**
	 * 所有的message,enum名称经过全局唯一处理后的内容
	 */
	content: string;
	/**
	 * 页面的option
	 */
	options: {
		[key: string]: any;
	};

	cmds: {
		[index: number]: Cmd
	};
	/**
	 * 导出的引用
	 */
	refs: ProtoRefDict;

	/**
	 * 需要引入的名称
	 */
	impRefNames: string[];
}

/**
 * proto引用
 */
interface ProtoRef {
	/**
	 * 名称
	 */
	name: string;
	/**
	 * 所在页面
	 */
	page: Page;
	/**
	 * 对应的proto
	 */
	proto: Proto;

	type: ProtoType;
}

declare type ProtoRefDict = { [name: string]: ProtoRef }

declare type Proto = import("protobufjs").ProtoEnum | import("protobufjs").ProtoMessage;


interface Window {
	log(msg: string, color?: string);

	error(msg: string | Error, err?: Error);
}

declare const enum Const {

	BasePath = "pbtool",
	GitTempPath = "gittmp",

	MarkDownExt = ".md",

}

declare const enum ProtoType {
	Message = "message",
	Enum = "enum",
}