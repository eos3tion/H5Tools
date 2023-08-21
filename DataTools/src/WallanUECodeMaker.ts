import { getManualCodeInfo, genManualAreaCode } from "./MenualCodeHelper.js";
const path: typeof import("path") = nodeRequire("path");

const pros = [] as string[];

let _cfg: GlobalCfg;
let _fcfg: FileConfig;
let sdict: { [index: string]: string };
let _outFilePath: string;
let _pathSPackage: string;
let className: string;

const Defs = {
    [TypeCheckerKey.Number]: "0.0",
    [TypeCheckerKey.Float]: "0.0f",
    [TypeCheckerKey.Int]: "0",
    [TypeCheckerKey.Bool]: "false"
}

function addProperty(define: ProDefine, checker: TypeChecker, descs: string[]) {

    pros.push(`/**`);
    descs.forEach(line => {
        pros.push(` * ${line}  `);
    });
    pros.push(` */`);
    pros.push(`UPROPERTY(EditDefaultsOnly, BlueprintReadWrite)`);
    let defData = Defs[checker.key];
    let def = "";
    if (defData) {
        def = ` = ${defData}`;
    }
    pros.push(`${checker.ueType} ${define.name}${def};`);
    pros.push(`\n`);
}

function flash() {
    let createTime = new Date().format("yyyy-MM-dd HH:mm:ss");
    // 生成服务端代码
    if (pros.length) {
        return {
            code:
                `#pragma once
#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "${className}.generated.h"

${genManualAreaCode("$area1", sdict)}


/**
 * 由[H5Tools](https://github.com/eos3tion/H5Tools)数据工具生成，从"${_fcfg.path}"生成
 * 创建时间：${createTime}
 */
USTRUCT(BlueprintType)
struct F${className} : public FTableRowBase
{
	GENERATED_BODY()

	${genManualAreaCode("$area2", sdict, `\t`)}

	${pros.join(`\n\t`)}
};`,
            path: _outFilePath,
            packagePath: _pathSPackage,
            className
        }

    }
}

function init(fcfg: FileConfig, cfg: GlobalCfg) {
    _outFilePath = getFilePath(fcfg);
    sdict = getManualCodeInfo([_outFilePath]);
    pros.length = 0;
    _fcfg = fcfg;
    _cfg = cfg;
}

function getExt() {
    return Ext.CStructHead
}

function getFilePath(fcfg: FileConfig) {
    let { sfilePackage, name, sPath } = fcfg;
    _pathSPackage = sfilePackage.replace(/\./g, "/");
    className = `${getFileName(name)}${Suffix.Server}`;
    return path.join(sPath, _pathSPackage, `${className}${getExt()}`)
}

function getFileName(name: string) {
    return name[0].toUpperCase() + name.substr(1);
}

window.serverCodeMaker = {
    init,
    addProperty,
    flash,
    getExt
}