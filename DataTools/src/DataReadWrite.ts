import { AMF3Bytes } from "./structure/AMF3Bytes.js";
import { ByteArray } from "./structure/ByteArray.js";
import { PBUtils } from "./structure/PBUtils.js";

const path: typeof import("path") = nodeRequire("path");
const fs: typeof import("fs") = nodeRequire("fs");
const zlib: typeof import("zlib") = nodeRequire("zlib");

const CfgHeadStruct: PBStruct = {
    1: [0, PBFieldType.Required, PBType.String]/*必有 属性名字*/,
    2: [1, PBFieldType.Required, PBType.Enum]/*必有 数值的数据类型*/,
    3: [2, PBFieldType.Optional, PBType.Enum]/*可选 此列的状态*/,
    4: [3, PBFieldType.Optional, PBType.SInt32]/*可选 bool / int32 型默认值 */,
    5: [4, PBFieldType.Optional, PBType.Double]/*可选 double 型默认值 */,
    6: [5, PBFieldType.Optional, PBType.String]/*可选 字符串型默认值 */
}

function writeCommonBinData(fname: string, directory: string, data: any[]) {
    const path: typeof import("path") = nodeRequire("path");
    const fs: typeof import("fs") = nodeRequire("fs");
    if (fs.existsSync(directory)) {
        let stat = fs.statSync(directory);
        if (stat.isDirectory()) {
            let len = data.length;
            let outpath = path.join(directory, fname + ".bin");
            if (len < 2) {//没有任何数据，顶多只有头
                //检查是否有文件，如果有，删除文件
                if (fs.existsSync(outpath)) {
                    fs.unlinkSync(outpath);
                }
                return;
            }
            let buffer = new ByteArray();//4M 配置  
            let heads = data[0] as HeadItem[];
            let hlen = heads.length;
            buffer.writeVarint(hlen);
            let struct = {};
            for (let i = 0; i < hlen; i++) {
                let head = heads[i];
                let strDef: string, i32Def: number, dblDef: number, pbType: PBType;
                let [name, headType, headState, def] = head;
                switch (headType) {
                    case TypeCheckerIndex.Any:
                    case TypeCheckerIndex.String:
                        if (def != undefined && def !== 0 /*json的版本，是使用不同类型的数值 0 来代表默认值的 */) {
                            strDef = def + "";
                        } else {
                            if (headType == TypeCheckerIndex.String) {
                                def = "";
                            }
                        }
                        pbType = PBType.String;
                        break;
                    case TypeCheckerIndex.Number:
                        if (def != undefined) {
                            dblDef = +def;
                        } else {
                            def = 0;
                        }
                        pbType = PBType.Double;
                        break;
                    case TypeCheckerIndex.Bool:
                    case TypeCheckerIndex.Int32:
                    case TypeCheckerIndex.Date:
                    case TypeCheckerIndex.Time:
                    case TypeCheckerIndex.DateTime:
                        if (def != undefined) {
                            i32Def = +def;
                        } else {
                            def = 0;
                        }
                        pbType = PBType.SInt32;
                        break;
                    case TypeCheckerIndex.Array:
                    case TypeCheckerIndex.Array2D:
                        if (def != undefined) {
                            strDef = JSON.stringify(def);
                        }
                        pbType = PBType.String;
                        break;
                }
                let pbhead = [name, headType, headState, i32Def, dblDef, strDef];
                let headBytes = PBUtils.writeTo(pbhead, CfgHeadStruct);
                let blen = headBytes.position;
                buffer.writeVarint(blen);
                buffer.writeBytes(headBytes, 0, blen);
                struct[i + 1] = [name, PBFieldType.Optional, pbType, def];
            }

            //记录数据总数量
            buffer.writeVarint(len - 1);
            for (let i = 1; i < len; i++) {
                let dat = data[i];
                let obj = {};
                for (let j = 0; j < hlen; j++) {
                    let head = heads[j];
                    let val = dat[j];
                    let [name, headType] = head
                    switch (headType) {
                        case TypeCheckerIndex.Any:
                        case TypeCheckerIndex.String:
                            if (val != undefined) {
                                if (val === 0 /*json的版本，是使用不同类型的数值 0 来代表默认值的 */) {
                                    val = undefined;
                                } else {
                                    val = val + "";
                                }
                            }
                            break;
                        case TypeCheckerIndex.Number:
                            if (val != undefined) {
                                val = +val;
                            }
                            break;
                        case TypeCheckerIndex.Bool:
                        case TypeCheckerIndex.Int32:
                        case TypeCheckerIndex.Date:
                        case TypeCheckerIndex.Time:
                        case TypeCheckerIndex.DateTime:
                            if (val != undefined) {
                                val = +val;
                            }
                            break;
                        case TypeCheckerIndex.Array:
                        case TypeCheckerIndex.Array2D:
                            if (val != undefined) {
                                val = JSON.stringify(val);
                            }
                            break;
                    }
                    obj[name] = val;
                }
                let datBytes = PBUtils.writeTo(obj, struct);
                let blen = datBytes.position;
                buffer.writeVarint(blen);
                buffer.writeBytes(datBytes, 0, blen);
            }
            fs.writeFileSync(outpath, buffer.buffer.slice(0, buffer.position));
            return outpath;
        }
    }
    return null;
}
/**
 * 向文件写入AMF数据
 * 
 * @export
 * @param {File} file 拖入的文件
 * @param {string} directory 要存储的文件路径
 * @param {*} data 数据
 * @returns {string}   存储成功返回文件路径<br/>
 *                     存储失败返回null
 */
function writeAMFData(fname: string, directory: string, data: any, ext = ".jat", compress?: boolean): string {
    if (fs.existsSync(directory)) {
        let stat = fs.statSync(directory);
        if (stat.isDirectory()) {
            let outpath = path.join(directory, fname + ext);
            let ba = new AMF3Bytes();
            ba.writeObject(data);
            let buffer = ba.usedBuffer;
            if (compress) {
                buffer = zlib.deflateRawSync(buffer);
            }
            fs.writeFileSync(outpath, buffer);
            return outpath;
        }
    }
    return null;
}

/**
 * 向文件写入JSON数据
 * 
 * @export
 * @param {File} file 拖入的文件
 * @param {string} directory 要存储的文件路径
 * @param {*} data 数据
 * @returns {string}   存储成功返回文件路径<br/>
 *                     存储失败返回null
 */
function writeJSONData(fname: string, directory: string, data: any): string {
    if (fs.existsSync(directory)) {
        let stat = fs.statSync(directory);
        if (stat.isDirectory()) {
            let outpath = path.join(directory, fname + Ext.Json);
            fs.writeFileSync(outpath, JSON.stringify(data));
            return outpath;
        }
    }
    return;
}

/**
 * 读取AMF数据
 * 
 * @param {string} filePath
 * @param {boolean} [compress]
 * @returns
 */
function readAMFData(filePath: string, compress?: boolean) {
    let ba = new AMF3Bytes();
    let buffer = fs.readFileSync(filePath);
    if (compress) {
        buffer = zlib.inflateRawSync(buffer);
    }
    ba.buffer = buffer;
    ba.position = 0;
    return ba.readObject();
}

export { readAMFData, writeAMFData, writeJSONData, writeCommonBinData };