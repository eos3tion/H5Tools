const fs: typeof import("fs") = nodeRequire("fs");


const ident = `\t`;


const regValue = /\s*inline static const NetCMD ([A-Z][a-zA-Z_$0-9]+) = "(.*?)";\n/g;

const icmdRegValue_C = /\s*?\{"([a-zA-Z_$0-9/]+)"\s*?,\s*?(\d+)\s*?\},\n/g;
const icmdRegValue_S = /\s*?\{(\d+)\s*?,\s*?"([a-zA-Z_$0-9/]+)"\}\,\n/g;

/**
 * 用于创建服务名字的常量文件
 * 
 * @export
 * @class CmdTemplate
 */

export function addCmds(file: string, cmds: UECmdDict, c2stype: string, error: Function, ModuleAPIName: string, icmds_c: { [name: string]: number }, icmds_s: { [name: number]: string }) {
    let dict: UECmdDict = {};
    let dictName: { [cmd: string]: string } = {};
    //S2C理论上允许使用同一个cmd
    //即 一个cmd可以有多个回调，所以以name作为字典
    //验证 C2S的，不允许绑定多个指令

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        let content = fs.readFileSync(file, "utf8");
        regValue.lastIndex = 0;
        while (true) {
            let res = regValue.exec(content);
            if (res) {
                let name = res[1];
                let cmd = res[2];
                dict[name] = cmd;
                if (name.endsWith(c2stype)) {
                    dictName[cmd] = name;
                }
            } else {
                break;
            }
        }
        //检查传入的名称和cmd是否出现重复
        for (let name in cmds) {
            let cmd = cmds[name];
            let oname = dictName[cmd];
            if (oname && oname != name) {
                error(`${oname}和${name}不一致，但使用了相同的cmd[${cmd}]`);
            }
            dict[name] = cmd;
        }
        //基于字符串排序
        let arr = Object.keys(dict);
        arr.sort();

        let arr2: string[] = [];
        icmdRegValue_C.lastIndex = 0;
        while (true) {
            let res = icmdRegValue_C.exec(content);
            if (res) {
                let name = res[1];
                let icmd = parseInt(res[2]);
                if (icmds_c[name] !== undefined && icmds_c[name] != icmd) {
                    error(`ICMD ${name} 与已存在的值不一致`);
                } else {
                    arr2.push(name);
                    icmds_c[name] = icmd;
                }
            } else {
                break;
            }
        }

        arr2.sort((a, b) => {
            return icmds_c[a] - icmds_c[b];
        });


        icmdRegValue_S.lastIndex = 0;
        let arr3:number[] = [];
        while (true) {
            let res = icmdRegValue_S.exec(content);
            if (res) {
                let name = parseInt(res[1]);
                let icmd = res[2];
                if (icmds_s[name] !== undefined && icmds_s[name] != icmd) {
                    error(`ICMD ${name} 与已存在的值不一致`);
                } else {
                    arr3.push(name);
                    icmds_s[name] = icmd;
                }
            } else {
                break;
            }
        }

        arr3.sort((a, b) => {
            return (+a) - (+b);
        });


        let c = `#pragma once
#include "NetCore.h"

class ${ModuleAPIName}NetCMDs
{
public:
`;
        for (let i = 0; i < arr.length; i++) {
            let name = arr[i];
            let cmd = dict[name];
            c += `${ident}inline static const NetCMD ${name} = "${cmd}";\n`;
        }
        c += `${ident}inline static TMap<NetCMD, uint32> NetCMDMap_C = {\n`;
        for (let i = 0; i < arr2.length; i++) {
            let key = arr2[i];
            c += `${ident}${ident}\{"${key}", ${icmds_c[key]}\},\n`;
        }
        c += `${ident}};\n`;

        c += `${ident}inline static TMap<uint32, NetCMD> NetCMDMap_S = {\n`;
        for (let i = 0; i < arr3.length; i++) {
            let key = arr3[i];
            c += `${ident}${ident}\{${key}, "${icmds_s[key]}"},\n`;
        }
        c += `${ident}};\n`;

        c += `\n};`;
        fs.writeFileSync(file, c);
        return c;
    }
    return "";
}