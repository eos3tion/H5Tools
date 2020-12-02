"use strict";
import "Const";
import * as _pbjs from "../lib/protobuf";

const projectKey = "JprotoTools_";

const $g = (id) => { return <HTMLInputElement>document.getElementById(id) };

hljs.loadLanguage("typescript");


import ServerProxy3 from "ServerProxy3";
import ServerProxy4 from "ServerProxy4";
import { requestAll, parseProto, request } from "ClientProxy";
import CookieForPath from "CookieForPath";
import { error, log } from "Helper";
import { createTest } from "./CreateTest";


ready(() => {
	const cookieForPath = new CookieForPath(projectKey);
	cookieForPath.getPathCookie("txtClientPath");
	cookieForPath.getPathCookie("txtServerHttp");
	cookieForPath.getPathCookie("txtProtoPackage");
	cookieForPath.getPathCookie("txtCmdClassFullPath");
	cookieForPath.getPathCookie("txtServerWiki");
	cookieForPath.getPathCookie("txtProtoOutput");
	cookieForPath.getPathCookie("selLanguage");
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


	//得到所有数据的注册
	$g("btnCreateTest").addEventListener("click", () => {
		let wikiUrl = cookieForPath.setPathCookie("txtServerWiki", false, false);
		createTest(wikiUrl);
	})

	$g("btnGen").addEventListener("click", () => {
		let cPath = cookieForPath.setPathCookie("txtClientPath");
		// 清理code区
		$g("code").innerHTML = "";
		// 检查url路径
		let url: string = $g("txtUrl").value;
		url = url.trim();
		let gcfg: ClientCfg = { cprefix: cPath, url, PBMsgDictName: ConstString.PBDictFileName, ServiceName: ConstString.ServiceNameFile };
		if (url) {
			request(url, gcfg);
		} else {
			let proto = $g("txtProto").value;
			if (proto) {
				parseProto(proto, gcfg);
			} else {
				error("没有填写wiki地址，也没有在文本框中输入任何proto数据。")
			}
		}
	});

	const btnClientAll = $g("btnClientAll");
	btnClientAll.addEventListener("click", async () => {
		btnServer.disabled = true;
		let cPath = cookieForPath.setPathCookie("txtClientPath");
		// 清理code区
		$g("code").innerHTML = "";
		// 检查url路径
		let url: string = $g("txtUrl").value;
		url = url.trim();
		let gcfg: ClientCfg = { cprefix: cPath, url, PBMsgDictName: ConstString.PBDictFileName, ServiceName: ConstString.ServiceNameFile }
		try {
			await requestAll(cookieForPath, gcfg);
		} catch (e) {
			error(e);
		}
		btnServer.disabled = false;
	});

});

