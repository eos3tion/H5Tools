"use strict";
import "Const";
import _proto = require("protobufjs");
import * as _pbjs from "../lib/protobuf";
const pbjs: typeof _proto = _pbjs;
import ServiceNameTemplate from "ServiceNameTemplate";
import PBMsgDictTemplate from "PBMsgDictTemplate";
import { addCmds } from "CmdTemplate";
import _fs = require("fs");
const fs: typeof _fs = nodeRequire("fs");
const path = nodeRequire("path");
const clipboard = nodeRequire('electron').clipboard;

const projectKey = "JprotoTools_";

const $g = (id) => { return <HTMLInputElement>document.getElementById(id) };

let c2sType: string;
let s2cType: string;


hljs.loadLanguage("typescript");

/**
 * 输出日志
 */
function log(msg: string, color?: string) {
	let txtLog = $g("txtLog");
	if (txtLog) {
		txtLog.innerHTML += color ? `[${new Date().format("HH:mm:ss")}]<font color="${color}">${msg}</font><br/>` : `${msg}<br/>`;
	}
	txtLog.scrollIntoView(false);
}
/**
 * 输出错误
 */
function error(msg: string | Error, err?: Error) {
	if (typeof msg !== "string") {
		err = msg;
		msg = "";
	}
	let errMsg = "";
	if (err) {
		errMsg = `
<font color="#f00"><b>err:</b></font>
${err.message}
<font color="#f00"><b>stack:</b></font>
${err.stack}`
	}
	log(`<font color="#f00">${msg}</font>${errMsg}`);
	console.error(msg, err);
}

function getEnumVariable(field: ProtoBuf.ProtoField, variables: string[], isEnd: boolean): FieldData {
	let comment = field.comment;// 调整protobuf.js代码 让其记录注释
	let fname = field.name;
	let fValue = field.id;
	let [fieldType, isMsg, , repeated] = field2type(field);
	variables.push(`/**`);
	variables.push(` * ${comment}`);
	variables.push(` */`);
	if (!isEnd) {
		variables.push(`${fname}= ${fValue},`);
	}
	else {
		variables.push(`${fname}= ${fValue}`);
	}
	return { fieldName: fname, fieldType, isMsg, tType: NSType.Uint32, repeated };
}


function getVariable(field: ProtoBuf.ProtoField, variables: string[]): FieldData {
	let comment = field.comment;// 调整protobuf.js代码 让其记录注释
	let fname = field.name;
	let def = "";//改成不赋值默认值，这样typescript->js能减少字符串输出，将默认值记入mMessageEncode，也方便传输时做判断
	let [fieldType, isMsg, tType, repeated] = field2type(field);
	if (field.rule == "required") { // 可选参数
		variables.push(`/**`);
		variables.push(` * ${comment}`);
		variables.push(` */`);
		variables.push(`${fname}: ${fieldType};`);
	} else {
		variables.push(`/**`);
		variables.push(` * 可选参数 ${comment}`);
		variables.push(` */`);
		variables.push(`${fname}?: ${fieldType};`);
	}
	return { fieldName: fname, fieldType, isMsg, tType, repeated };
}


function parseProto(proto: string, gcfg?: ClientCfg, url?: string) {
	url = url || (gcfg ? gcfg.url : "");
	url = url || "[文本框中，复制粘贴]";
	let cprefix = gcfg ? gcfg.cprefix : null;
	let PBMsgDictName = gcfg ? gcfg.PBMsgDictName : null;
	let ServiceName = gcfg ? gcfg.ServiceName : null;
	cprefix = cprefix || "";
	let p;
	try {
		p = pbjs.DotProto.Parser.parse(proto);
	} catch (e) {
		error(e);
		return;
	}
	let options = p.options;
	// 处理文件级的Option
	let fcpath: string = options[Options.ClientPath];
	let fcmodule: string = options[Options.ClientModule];
	let service: string = options[Options.ServiceName];
	let pbindex: number = options[Options.PbIndex];
	let now = new Date().format("yyyy-MM-dd HH:mm:ss");
	let idx = 0;
	//处理枚举
	let enumDict: { [index: string]: string } = {};
	for (let e of p.enums) {
		let className: string = e.name;
		let variables: string[] = [];
		// 如果有消息体的同名 Option，覆盖
		let options = e.options;
		let cpath: string = options[Options.ClientPath] || fcpath;
		let cmodule: string = options[Options.ClientModule] || fcmodule;
		enumDict[className] = cpath;
		let values = e.values;
		let vlen: number = values.length;
		for (let i: number = 0; i < vlen; i++) {
			let v = values[i];
			v["type"] = "enum";
			getEnumVariable(v, variables, (i + 1 == vlen));
		}

		let clientCode = getClientEnumCode(now, url, className, cmodule, variables);
		if (cprefix && cpath != undefined/*cpath允许为`""`*/) {
			let cdir = path.join(cprefix, cpath, "enums");
			let out = writeFile(className + ".d.ts", cdir, clientCode);
			if (out) {
				log(`<font color="#0c0">生成客户端代码成功，${out}</font>`);
			}
		}
		createContent($g("code"), className, idx++, clientCode);
	}
	let hasService = false;
	let msgEncDict: { [index: string]: string } = {};
	let cmdDict: { [name: string]: number } = {};
	// 客户端和服务端的Service收发数组
	let cSends: Func[] = [], cRecvs: Func[] = [], cRegs: string[] = [], sSends: Func[] = [], sRecvs: Func[] = [], sRegs: string[] = [], simports: string[] = [];
	for (let msg of p.messages) {
		// 所有的变量
		// 一行一个
		let variables: string[] = [];
		let messageEncodes: string[] = [];
		// 如果有消息体的同名 Option，覆盖
		let options = msg.options;
		let cpath: string = options[Options.ClientPath] || fcpath;
		let cmodule: string = options[Options.ClientModule] || fcmodule;
		let cmddata: any = options[Options.CMD];
		let climit: number = +options[Options.ClientLimit];
		//如果设置的不是整数，则让climit为undefined
		isNaN(climit) && (climit = undefined);
		let cmds: number[] = Array.isArray(cmddata) ? cmddata : [cmddata];
		// repeated 字段的数量
		let repeatedCount = 0;
		let fieldDatas: FieldData[] = [];
		let imports: string[] = [];
		for (let field of msg.fields) {
			let rule: string = field.rule;
			let fnumber = type2number[field.type];
			let MType = "";
			let def = field.options.default;
			if (def !== undefined) {
				let t = typeof def;
				if (t === "string") {
					def = `"${def}"`;
				} else if (t === "object") {//不支持对象类型默认值
					def = undefined;
				}
			}
			let data = getVariable(field, variables);
			fieldDatas.push(data);
			let fname: string = field.name;
			let ftype: string = field.type;
			if (enumDict[field.type] || ftype.startsWith("E_")) {//定义的字段存在于enum集合中 或者 常量类型以E_开头命名
				fnumber = PBType.Enum;
				MType = ``;
				data.tType = NSType.Int32;
				data.isMsg = MsgType.NotMessage;
			}
			else if (fnumber == undefined) {// message类型不支持默认值
				fnumber = PBType.Message;// message
				MType = `, ${ConstString.PBDictKeyName}.${field.type}`;
			} else if (def !== undefined) {
				MType = `, , ${def}`;
			}
			messageEncodes.push(`${field.id}: ["${fname}", ${rule2number[rule]}, ${fnumber}${MType}]`);

			if (rule == "repeated") {
				repeatedCount++;
			}
		}
		simports = simports.concat(imports);
		// 根据CMD 生成通信代码
		// 生成代码
		let className: string = msg.name;
		/**
		 * 是否需要生成消息
		 */
		let isCreateMsg = true;
		// 进行消息检查
		// 会生成ProtoBuf Message的情况：
		// 1. 消息中 field 超过 2个
		// 2. 消息中 field 为 1个，但是数据为 repeated
		// 3. 消息为非 S2C 或者 C2S 的情况
		// let type = className.substr(-3);
		let ctype = className.substr(-1 * c2sType.length);
		let stype = className.substr(-1 * s2cType.length);
		let c = ctype == c2sType;
		let s = stype == s2cType;
		// let type = c ? ctype : s ? stype : "";
		if (c || s) {
			let fleng = fieldDatas.length;
			isCreateMsg = !isOptMsg || fleng > 1 || (fleng == 1 && repeatedCount > 0)
		}

		let handlerName = className[0].toLowerCase() + className.substring(1);
		if (c) { // client to server
			hasService = true;
			makeCSendFunction(fieldDatas, className, handlerName, cSends, cmds[0], msg.source, cmdDict, climit);
		} else if (s) { // server to client
			hasService = true;
			makeReciveFunc(className, handlerName, cRegs, cRecvs, cmds, fieldDatas, false, msg.source, cmdDict, service);
		}

		if (isCreateMsg) { //需要生成消息
			msgEncDict[className] = `{ ${messageEncodes.join(", ")} }`;
			let clientCode = getClientCode(now, url, className, cmodule, variables);
			if (cprefix && cpath != undefined/*cpath允许为`""`*/) {
				let cdir = path.join(cprefix, cpath, "msgs");
				let out = writeFile(className + ".d.ts", cdir, clientCode);
				if (out) {
					log(`<font color="#0c0">生成客户端代码成功，${out}</font>`);
				}
			}
			createContent($g("code"), className, idx++, clientCode);
		}
		// console.log(clientCode);
		// console.log("============================================================");
		// console.log(serverCode);
	}

	//处理PBMsgDict文件
	let temp = new PBMsgDictTemplate();

	let cnPath = PBMsgDictName ? path.join(cprefix, PBMsgDictName) : undefined;
	let crout = temp.addToFile(cnPath, msgEncDict, false, url, pbindex);
	if (cprefix && PBMsgDictName) {
		let out = writeFile(PBMsgDictName, cprefix, crout);
		if (out) {
			log(`<font color="#0c0">生成服务端PBMsgDict代码成功，${out}</font>`);
		}
	}

	createContent($g("code"), "ProtoBuf字典", idx++, crout);

	//处理CMD文件
	if (cprefix) {
		let crout = path.join(cprefix, ConstString.PBCmdName + ".d.ts");
		let out: string;
		try {
			out = addCmds(crout, cmdDict, c2sType, error);
		} catch (e) {
			error(e);
		}
		createContent($g("code"), ConstString.PBCmdName + ".d.ts", idx++, out);
	}


	if (service && hasService) {
		//预处理Service
		//检查是否有客户端Service文件
		let cdir = path.join(cprefix, fcpath);
		let sfileName = service + ".ts";
		let cpath = path.join(cdir, sfileName);
		let ccode = getCServiceCode(now, url, service, fcmodule, cSends, cRecvs, cRegs, getManualCodeInfo(cpath));


		// 创建客户端Service
		if (cprefix && cpath != undefined/*cpath允许为`""`*/) {

			let out = writeFile(sfileName, cdir, ccode, wikiCheck);
			if (out) {
				log(`<font color="#0c0">生成客户端Service代码成功，${out}</font>`);
			}

		}

		createContent($g("code"), service, idx++, ccode);
		// 创建ServiceName常量文件
		if (cprefix && ServiceName && cpath != undefined/*cpath允许为`""`*/) {

			let ctemp = new ServiceNameTemplate();
			let cnPath = path.join(cprefix, ServiceName);
			let code = ctemp.addToFile(cnPath, service);
			let out = writeFile(ServiceName, cprefix, code);
			if (out) {
				log(`<font color="#0c0">生成客户端端ServiceName代码成功，${out}</font>`);
			}
			createContent($g("code"), ServiceName, idx++, code);
		}
	}
}

function makeCSendFunction(fnames: FieldData[], className: string, handlerName: string, sends: Func[], cmd: number, wiki: string, cmdDict: { [name: string]: number }, climit?: number) {
	let func = <Func>{};
	sends.push(func);
	let lines: string[] = [];
	func.name = handlerName;
	func.lines = lines;
	func.wiki = wiki;
	func.type = 0;
	func.isServer = false;
	let len = fnames.length;
	let climitStr = climit == undefined ? "limit?: number" : `limit = ${climit}`;
	let strCMD = `${ConstString.PBCmdName}.${className}`;
	cmdDict[className] = cmd;
	if (len == 0) { //没有参数
		lines.push(`${handlerName}(${climitStr}) {`);
		lines.push(`/*|${handlerName}|*/`);
		lines.push(`\tthis.send(${strCMD}, null, null, limit)`);
	} else if (isOptMsg && len == 1) {
		let p = fnames[0];
		if (p.repeated) {
			lines.push(`${handlerName}(_${className}: ${className}, ${climitStr}) {`);
			lines.push(`/*|${handlerName}|*/`);
			lines.push(`\tthis.send(${strCMD}, _${className}, ${ConstString.PBDictKeyName}.${className}, limit);`);
		}
		else {
			lines.push(`${handlerName}(_${p.fieldName}: ${p.fieldType}, ${climitStr}) {`);
			lines.push(`/*|${handlerName}|*/`);
			lines.push(`\tthis.send(${strCMD}, _${p.fieldName}, ${p.tType}, limit);`);
		}
	} else {
		lines.push(`${handlerName}(_${className}: ${className}, ${climitStr}) {`);
		lines.push(`/*|${handlerName}|*/`);
		lines.push(`\tthis.send(${strCMD}, _${className}, ${ConstString.PBDictKeyName}.${className}, limit);`);
	}
	lines.push(`}`)
}

function makeReciveFunc(className: string, handlerName: string, regs: string[], recvs: Func[], cmds: number[], fnames: FieldData[], isServer: boolean, wiki: string, cmdDict: { [name: string]: number }, service?: string) {
	let func = <Func>{};
	recvs.push(func);
	let lines: string[] = [];
	func.name = handlerName;
	func.lines = lines;
	func.wiki = wiki;
	func.type = 1;
	func.isServer = isServer;
	let len = fnames.length;
	// let strCMD = cmds.length == 1 ? cmds[0] : `[${cmds.join(", ")}]`;
	let strCMD: string;
	if (cmds.length == 1) {
		strCMD = `${ConstString.PBCmdName}.${className}`;
		cmdDict[className] = cmds[0];
	} else {
		let i = 0;
		let tmp = [];
		cmds.forEach(cmd => {
			let name = className + i;
			cmdDict[name] = cmd;
			tmp.push(`${ConstString.PBCmdName}.${name}`);
			i++;
		});
		strCMD = `[${tmp.join(", ")}]`;
	}
	let p: FieldData;
	let strType;
	if (len == 0) {//为null
		strType = NSType.Null;
		// regs.push(`this.regMsg(${NSType.Null}, ${strCMD});`);
	} else if (len == 1) {//如果是一个参数，并且是PBMessage类型，则添加注册
		if (isOptMsg) {
			p = fnames[0];
			if ((p.isMsg & MsgType.isMsg) == MsgType.isMsg) {
				className = p.fieldType;
				len = 2;//用于处理后续判断
			} else {
				if (p.repeated) {
					len = 2;//用于处理后续判断
				} else {
					// regs.push(`this.regMsg(${p.tType}, ${strCMD});`);
					strType = p.tType;
				}
			}
		} else {
			len = 2;//不做优化处理
		}
	}
	if (len > 1) {
		strType = `${ConstString.PBDictKeyName}.${className}`;
	}
	regs.push(`\t${strCMD}, ${strType}, ${handlerName},`);

	lines.push(`function ${handlerName}(this: ${service}, _data: NetData) {`);
	if (len > 1) {
		lines.push(`\tlet msg: ${className} = _data.data;`);
	} else if (len == 1) { //创建数据
		lines.push(`\tlet _${p.fieldName}: ${p.fieldType} = _data.data;`);
	}
	lines.push(`/*|${handlerName}|*/`);
	lines.push(`}`);
}

function addImport(imp: string, imports: string[]) {
	if (!~imports.indexOf(imp)) {
		imports.push(imp);
	}
}

function writeFile(fname: string, directory: string, data: string, otherCheck?: { (originContent: string, content: string): boolean }): string {
	let outpath = path.join(directory, fname);
	try {
		// 检查是否有原始文件，检查文件的原始内容和去除了下面信息之后的内容是否相同
		/**
		 * 使用JunyouProtoTools，从 ${path} 生成
		 * 生成时间 ${createTime}
		 **/
		if (fs.existsSync(outpath)) {//有原始文件
			let originContent = fs.readFileSync(outpath, "utf8");
			if (minifyCode(originContent) == minifyCode(data)) {
				if (!otherCheck || otherCheck(originContent, data)) {
					return `和${outpath}内容相同，无需生成`;
				}
			}
		}

		FsExtra.writeFileSync(outpath, data, true);
	} catch (e) {
		error(`写入文件时失败，路径："${directory}"，文件名："${fname}"`, e);
		return null;
	}
	return outpath;
}

function getClientEnumCode(createTime: string, path: string, className: string, module: string, variables: string[]) {
	let vars = `		    ` + variables.join(`\n		    `);
	return `/**
* 使用JunyouProtoTools，从 ${path} 生成
* 生成时间 ${createTime}
**/
declare namespace ${module} {
	const enum ${className} {
${vars}
	}
}
`;
}


function getClientCode(createTime: string, path: string, className: string, module: string, variables: string[]) {
	let vars = `		` + variables.join(`\n		`);
	return `/**
 * 使用JunyouProtoTools，从 ${path} 生成
 * 生成时间 ${createTime}
 **/
declare namespace ${module} {
	export interface ${className}{
${vars}
	}
}
`
}

function getCServiceCode(createTime: string, path: string, className: string, module: string, sends: Func[], recvs: Func[], regs: string[], cinfo: { manuals: { [index: string]: string }, comments: { [index: string]: string } }) {
	return `/**
 * 使用JunyouProtoTools，从 ${path} 生成
 * 生成时间 ${createTime}
 **/
namespace ${module} {
	${genManualAreaCode("$area1", cinfo.manuals, `\t`)}

${parseFuncs(recvs, cinfo, `\t`)}

	export class ${className} extends Service {
		constructor() {
			super(ServiceName.${className});
		}
		
		onRegister() {
			super.onRegister();
			this.reg(
			${regs.join(`\n			`)}
			);
			${genManualAreaCode("$onRegister", cinfo.manuals, `\t\t\t`)}
		}
		
${parseFuncs(sends, cinfo, `\t\t`)}
		${genManualAreaCode("$area2", cinfo.manuals, `\t\t`)}
	}
	${genManualAreaCode("$area3", cinfo.manuals, `\t`)}
}`
}


function parseFuncs(funcs: Func[], cinfo: { manuals: { [index: string]: string }, comments: { [index: string]: string } }, indent = "") {
	return funcs.map(func => {
		let comment = cinfo.comments[func.name];
		if (!comment) {
			comment = getDefaultComments(func).join(`\n${indent}`);
		} else {
			let wikilines: string[] = [];
			getWikiComments(wikilines, func.wiki);
			comment = comment.replace(/(?=\s+)[ ][*][ ]↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓[ ]wiki[ ]↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓[^]*?[*][ ]↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑[ ]wiki[ ]↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑/, wikilines.join(`\n${indent}`));
		}
		return `${indent}${comment}\n${indent}${replaceFuncManuals(func.lines.join(`\n${indent}`), cinfo.manuals, indent)}`;
	}).join(`\n`);
}

function wikiCheck(originContent, content) {
	let commentReg = /[/][*][*]【([$_a-zA-Z][$_a-zA-Z0-9]+)】([^]*?)[*][/]/g;
	let oComments = new Map<string, string>();
	let comments = new Map<string, string>();
	while (true) {
		let result = commentReg.exec(originContent);
		if (result) {
			let comment = result[0];
			let key = result[1];
			oComments.set(key, comment.replace(/\s+/g, ""));
		} else {
			break;
		}
	}
	commentReg.lastIndex = 0;
	while (true) {
		let result = commentReg.exec(content);
		if (result) {
			let comment = result[0];
			let key = result[1];
			comments.set(key, comment.replace(/\s+/g, ""));
		} else {
			break;
		}
	}

	for (let [key, value] of oComments) {
		if (comments.get(key) != value) {
			return false;
		}
	}
	return true;
}


function replaceFuncManuals(rep: string, manuals: { [index: string]: string }, indent: string = "") {
	return rep.replace(/[/][*][|]([$_a-zA-Z0-9]+)[|][*][/]/g, (rep, hander) => {
		return `\t` + genManualAreaCode(hander, manuals, `${indent}\t`);
	})
}

/**
 * 获取默认的注释
 * 
 * @param {Func} func
 */
function getDefaultComments(func: Func) {
	/**【xHandler】
	 * ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ wiki ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
	 * wiki......
	 * ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ wiki ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
	 *
	 * 这里写手写的注释
	 */
	let wikiContents: string[] = [`/**【${func.name}】`];
	getWikiComments(wikiContents, func.wiki);
	wikiContents.push(` *`);
	wikiContents.push(` * 这里写手写的注释`)
	wikiContents.push(` */`);
	return wikiContents;
}

/**
 * 获取wiki内容
 * 
 * @param {string[]} lines
 * @param {string} wiki
 */
function getWikiComments(lines: string[], wiki: string) {
	if (wiki) {
		lines.push(
			` * ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ wiki ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓`,
			" * ```protobuf"
		);
		wiki.split("\n").forEach(line => {
			lines.push(` * ${line}`);
		});
		lines.push(
			" * ```",
			` * ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ wiki ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑`
		);
	}
}

import getPageProto from "getPageProto";

/**
 * 提取Proto数据
 */
function getProtoData(data: { content: string, params?: ClientCfg, url: string }) {
	let proto;
	try {
		proto = getPageProto(data.content);
	} catch (e) {
		error(e.message);
	}
	$g("txtProto").value = proto;
	parseProto(proto, data.params, data.url);
}


import { getHttpData } from "getHttpData";

async function getProtoFromHttp(url: string, gcfg?: ClientCfg) {
	//去掉url #号后的内容
	let idx = url.indexOf("#");
	if (idx > -1) {
		url = url.slice(0, idx);
	}
	try {
		getProtoData(await getHttpData(url, gcfg));
	} catch (e) {
		error(e);
	}
}


import ServerProxy3 from "ServerProxy3";
import ServerProxy4 from "ServerProxy4";
import ClientProxy from "ClientProxy";
import CookieForPath from "CookieForPath";


ready(() => {
	const cookieForPath = new CookieForPath(projectKey);
	cookieForPath.getPathCookie("txtClientPath");
	cookieForPath.getPathCookie("txtServerHttp");
	cookieForPath.getPathCookie("txtProtoPackage");
	cookieForPath.getPathCookie("txtCmdClassFullPath");
	cookieForPath.getPathCookie("txtServerWiki");
	isOptMsg = !!+cookie.getCookie(projectKey + "OptMsg");
	let chkOptimizeMsg = $g("chkOptimizeMsg");
	chkOptimizeMsg.checked = isOptMsg;
	chkOptimizeMsg.addEventListener("change", () => {
		isOptMsg = $g("chkOptimizeMsg").checked;
		cookie.setCookie(projectKey + "OptMsg", +isOptMsg + "");
	});
	let chkSpliteProto = $g("chkSpliteProto");
	chkSpliteProto.checked = !!+cookie.getCookie(projectKey + "chkSpliteProto");
	chkSpliteProto.addEventListener("change", () => {
		cookie.setCookie(projectKey + "chkSpliteProto", +$g("chkSpliteProto").checked + "");
	});
	const serverProxy3 = new ServerProxy3();
	const serverProxy4 = new ServerProxy4();
	const btnServer = $g("btnServer");
	btnServer.addEventListener("click", async () => {
		btnServer.disabled = true;
		try {
			let serverProxy: ServerProxy3;
			if (chkSpliteProto.checked) {
				serverProxy = serverProxy4;
			} else {
				serverProxy = serverProxy3;
			}
			let result = await serverProxy.request(cookieForPath);
			if (result) {
				if (result.alert) {
					alert(result.alert);
				}
				if (result.logs) {
					result.logs.split(/\n/).forEach(line => {
						log(line);
					})
				}
			}

		} catch (e) {
			error(e);
		}
		log("操作完成", "#00ff00");
		btnServer.disabled = false;
	});

	function setCSType() {
		let value = (document.querySelector("input[name=c2sradio]:checked") as HTMLInputElement).value;
		let arr = value.split("#");
		c2sType = arr[0];
		s2cType = arr[1];
	}
	setCSType();

	document.querySelectorAll("input[name=c2sradio]").forEach(radio => {
		radio.addEventListener("change", setCSType)
	})

	$g("btnGen").addEventListener("click", (ev) => {
		let cPath = cookieForPath.setPathCookie("txtClientPath");
		// 清理code区
		$g("code").innerHTML = "";
		// 检查url路径
		let url: string = $g("txtUrl").value;
		url = url.trim();
		let gcfg: ClientCfg = { cprefix: cPath, url, PBMsgDictName: ConstString.PBDictFileName, ServiceName: ConstString.ServiceNameFile };
		if (url) {
			getProtoFromHttp(url, gcfg);
		} else {
			let proto = $g("txtProto").value;
			if (proto) {
				parseProto(proto, gcfg);
			} else {
				error("没有填写wiki地址，也没有在文本框中输入任何proto数据。")
			}
		}
	});
	const clientProxy = new ClientProxy();
	const btnClientAll = $g("btnClientAll");
	btnClientAll.addEventListener("click", async (ev) => {
		btnServer.disabled = true;
		let cPath = cookieForPath.setPathCookie("txtClientPath");
		// 清理code区
		$g("code").innerHTML = "";
		// 检查url路径
		let url: string = $g("txtUrl").value;
		url = url.trim();
		let gcfg: ClientCfg = { cprefix: cPath, url, PBMsgDictName: ConstString.PBDictFileName, ServiceName: ConstString.ServiceNameFile }
		try {
			await clientProxy.request(cookieForPath, getProtoFromHttp, gcfg);
		} catch (e) {
			error(e);
		}
		btnServer.disabled = false;
	});

});

/**
 * 创建一个代码区
 * 
 * @private
 * @param {HTMLElement} parent (description)
 * @param {string} filename (description)
 * @param {number} idx (description)
 * @param {string} ccode (description)
 * @param {string} scode (description)
 */
function createContent(parent: HTMLElement, filename: string, idx: number, ccode: string, scode: string = "") {
	let pane = document.createElement("div");
	pane.style.border = "#000 solid 1px";
	let idCopyClient = "btnCopyClient" + idx;
	let idCopyServer = "btnCopyServer" + idx;
	let template = `<div>${filename}</div>
    <div style="width:100%;float:left;background:#eef">
        客户端代码：<input type="button" value="复制客户端代码" id="${idCopyClient}" />
        <pre style="width:100%;border:#ccf solid 1px;background:#000;color:#fff;font:'Microsoft Yahei'"><code>${hljs.highlightAuto(ccode, ["typescript"]).value}</code></pre>
    </div>`
	pane.innerHTML = template;
	parent.appendChild(pane);
	$g(idCopyClient).addEventListener("click", e => {
		clipboard.writeText(ccode);
	});
}

/**
 * 手写代码的默认提示
 */
const ManualCodeDefaultComment = {
	/**
	 * 类上方提示
	 */
	$area1: "//这里填写类上方的手写内容",
	/**
	 * 类中提示
	 */
	$area2: "//这里填写类里面的手写内容",
	/**
	 * 类下方提示
	 */
	$area3: "//这里填写类下发的手写内容",
	/**
	 * onRegister方法中
	 */
	$onRegister: "//这里写onRegister中手写内容",
	/**
	 * 处理函数提示
	 */
	$handler: "//这里填写方法中的手写内容",
}

/**
 * 生成手动代码区域的文本
 */
function genManualAreaCode(key: string, cinfo: { [index: string]: string }, indent = "") {
	let manual = cinfo[key];
	if (!manual) {
		if (key in ManualCodeDefaultComment) {
			manual = "\n" + indent + ManualCodeDefaultComment[key];
		} else {
			manual = "\n" + indent + ManualCodeDefaultComment.$handler;
		}
	}
	return `/*-*begin ${key}*-*/${manual}
${indent}/*-*end ${key}*-*/`
}

/**
 * 获取手动写的代码信息
 */
function getManualCodeInfo(file: string) {
	let manuals: { [index: string]: string } = {};
	/**
	 * 注释的字典
	 */
	let comments: { [index: string]: string } = {};
	if (file && fs.existsSync(file)) {
		//读取文件内容
		let content = fs.readFileSync(file, "utf8");

		// /*-*begin $area1*-*/
		// //这里填写类上方的手写内容
		// /*-*end $area1*-*/
		// class XXService{
		// protected handlerName(data:NetData) {
		// 	let msg:className = <className>data.data;
		// 	/*-*begin handlerName*-*/
		// 	//这里填写方法中的手写内容
		// 	/*-*end handlerName*-*/
		// }
		// /*-*begin $area2*-*/
		// //这里填写类里面的手写内容
		// /*-*end $area2*-*/
		// }
		// /*-*begin $area3*-*/
		// //这里填写类下发的手写内容
		// /*-*end $area3*-*/

		// 注释内容
		// /**【xHandler】
		//  *
		//  *
		//  */

		//找到注释内容
		let commentReg = /[/][*][*]【([$]?[a-zA-Z0-9]+)】([^]*?)[*][/]/g;
		while (true) {
			let result = commentReg.exec(content);
			if (result) {
				let comment = result[0];
				let key = result[1];
				comments[key] = comment;
			} else {
				break;
			}
		}
		//找到手写内容
		let reg = /[/][*]-[*]begin[ ]([$]?[a-zA-Z0-9_$]+)[*]-[*][/]([^]*?)\s+[/][*]-[*]end[ ]\1[*]-[*][/]/g
		while (true) {
			let result = reg.exec(content);
			if (result) {
				let key = result[1];
				let manual = result[2];
				if (!manual.trim()) {//没有注释
					continue;
				} else if (key in ManualCodeDefaultComment) {
					if (ManualCodeDefaultComment[key] == manual) {//类上中下的注释
						continue;
					}
				} else {
					if (ManualCodeDefaultComment.$handler == manual) {//函数注释
						continue;
					}
				}
				manuals[key] = manual;
			} else {
				break;
			}
		}
	}
	return { manuals, comments };
}

interface Func {
	/**
	 * 函数名称
	 * 
	 * @type {string}
	 * @memberOf Func
	 */
	name: string;
	/**
	 * 函数内容
	 * 
	 * @type {string}
	 * @memberOf Func
	 */
	lines: string[];
	/**
	 * 方法的类型
	 * 0/undefined 是send方法
	 * 1		   是recieve回调
	 * @type {number}
	 * @memberOf Func
	 */
	type: number;
	/**
	 * 
	 * 是否是服务器函数
	 * @type {boolean}
	 * @memberOf Func
	 */
	isServer: boolean;
	/**
	 * wiki的原始内容
	 * 
	 * @type {string}
	 * @memberOf Func
	 */
	wiki: string;
}

window.log = log;
window.error = error;