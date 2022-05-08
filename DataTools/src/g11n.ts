//提取xlsx中，客户端读取的，非ASCII区段字符串
import * as $XLSX from "xlsx";
declare var XLSX: typeof $XLSX;
const path: typeof import("path") = nodeRequire("path");
const fs: typeof import("fs") = nodeRequire("fs");

const START_ROW = "配置从这一行开始";

interface LangData {
    /**
     * 找到的字符串数据  
     */
    code: string;

    /**
     * 翻译
     */
    msg?: string;

    source: string[];
}

interface LangOutData extends LangData {

    datetime: number;
}

type LangDict = { [msg: string]: LangData };

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
    1?: string,
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
}


export interface CheckOption {
    fileName: string;
    langFilePath: string;
    log: { (msg: string, color?: string); };
    datas: any[];
    extraData?: ExtraBin[];
}

/**
 * 
 * @param fileName      表名
 * @param langFilePath  语言文件路径
 * @param datas         主数据
 * @param extraData     附加数据
 */
export function check({ fileName, langFilePath, log, datas, extraData }: CheckOption) {
    if (!fs.existsSync(langFilePath)) {//检查文件是否存在
        return log(`无法找到[${langFilePath}]`, "#f00")
    }
    if (fileName == path.basename(langFilePath, ".xlsx")) {
        return log(`翻译文件，请勿勾选生成翻译文件`, "#f00");
    }
    //检查主数据
    let rawData: { dict: LangDict, headerData: any[] };
    try {
        rawData = loadLangFile(langFilePath);
    } catch (e) {
        return log(e.message);
    }
    const { dict, headerData } = rawData;
    checkMainData(datas, dict, fileName);
    if (extraData) {
        checkExtraData(extraData, dict, fileName);
    }


    //将没有translate的放下面
    let list = Object.values(dict);
    list.sort((a, b) => getOrder(b) - getOrder(a));

    //回写文件
    saveData(headerData, list, langFilePath);

    log(`写入[${langFilePath}]成功`)

    function getOrder(a: LangData) {
        return a.msg ? 1 : 0;
    }
}

function saveData(headerData: any[], list: LangData[], filePath: string) {
    let output = [];
    for (let i = 0; i < headerData.length; i++) {
        output[i] = headerData[i];
    }
    let startRow = output.length;
    let j = startRow;
    for (let i = 0; i < list.length; i++) {
        const dat = list[i];
        output[j++] = [
            /*A*/undefined,
            /*B*/dat.code,
            /*C*/parseReturn(dat.msg),
            /*D*/dat.source.join("|"),
        ];
    }
    if (output.length > startRow) {
        output[startRow][0] = START_ROW;
    } else {
        output[startRow] = [START_ROW];
    }

    //写入数据
    let wb = {
        SheetNames: [SheetNames.Main],
        Sheets: {
            [SheetNames.Main]: sheet_from_array_of_arrays(output)
        }
    }

    var dat = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'buffer' });
    const fs = nodeRequire("fs") as typeof import("fs");
    fs.writeFileSync(filePath, dat);
    return

    function sheet_from_array_of_arrays(data: any[]) {
        let ws = {};
        let range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };
        const utils = XLSX.utils;
        for (let R = 0; R != data.length; ++R) {
            if (range.s.r > R) range.s.r = R;
            if (range.e.r < R) range.e.r = R;
            for (let C = 0; C != data[R].length; ++C) {
                if (range.s.c > C) range.s.c = C;
                if (range.e.c < C) range.e.c = C;
                let cell = { v: data[R][C] };
                if (cell.v == null) continue;
                let cell_ref = utils.encode_cell({ c: C, r: R });

                if (typeof cell.v === 'number') cell["t"] = 'n';
                else if (typeof cell.v === 'boolean') cell["t"] = 'b';
                else if (cell.v instanceof Date) {
                    cell["t"] = 'n'; cell["z"] = XLSX["SSF"]._table[14];
                    cell.v = datenum(cell.v);
                }
                else cell['t'] = 's';
                ws[cell_ref] = cell;
            }
        }
        if (range.s.c < 10000000 || range.s.r < 10000000) ws['!ref'] = utils.encode_range(range);
        return ws;
    }

    function datenum(v, date1904?) {
        if (date1904) v += 1462;
        var epoch = Date.parse(v);
        return (epoch - new Date(Date.UTC(1899, 11, 30)).valueOf()) / (24 * 60 * 60 * 1000);
    }
}


function parseReturn(msg: string) {
    return msg ? msg.replace(/&#10;/g, "\n").replace(/&#13;/g, "\r").replace(/(\r|\n)+/g, "\n") : "";
}

function loadLangFile(filePath: string) {
    //加载`翻译文件`
    let data = fs.readFileSync(filePath, "base64");
    let wb = XLSX.read(data);
    const Sheets = wb.Sheets;
    let utils = XLSX.utils;
    let lines = utils.sheet_to_json(Sheets[SheetNames.Main], { header: 1 }) as ExcelRow[];
    let len = lines.length;
    let startRow = -1;
    let headerData: any[] = [];
    for (let i = 0; i < len; i++) {
        let line = lines[i];
        if (line) {
            if (line[0] == START_ROW) {
                startRow = i;
                break;
            } else {
                headerData.push(line);
            }
        }
    }

    if (startRow == -1) {
        throw new Error(`没有找到数据起始列：${START_ROW}`);
    }

    let dict = {} as LangDict;
    for (let i = startRow; i < len; i++) {
        let line = lines[i];
        if (line) {
            const [, code, msg, sourceData] = line;
            let source: string[];
            if (sourceData) {
                source = sourceData.split("|");
            } else {
                source = [];
            }
            dict[code] = { code, msg, source };
        }
    }

    return {
        dict,
        headerData
    };
}

/**
 * 检查主数据
 * @param data 
 * @param dict 
 */
function checkMainData(datas: any[], dict: LangDict, fileName: string) {
    //检查主键
    for (const data of datas) {
        for (const key in data) {
            let v = data[key];
            setData(v, dict, fileName, `D_${key}`);
        }
    }
}

/**
 * 检查附加数据
 * @param extraData 
 * @param dict 
 */
function checkExtraData(extraData: ExtraBin[], dict: LangDict, fileName: string) {
    for (const data of extraData) {
        let v = data.value;
        setData(v, dict, fileName, `E_${data.key}`);
    }
}


function setData(v: any, dict: LangDict, fileName: string, sourceKey: string) {
    if (checkDataHasChn(v)) {
        //检查是否已经有此消息
        let dat = dict[v];
        if (!dat) {
            dict[v] = dat = { code: v, source: [] };
        }
        let key = `${fileName}_${sourceKey}`;
        let source = dat.source;
        if (source.indexOf(key) === -1) {
            source.push(key);
        }
    }
}

function checkDataHasChn(data: any) {
    if (typeof data === "string") {
        return checkHasChn(data);
    }
}


/**
 * 检查是否有中文区段的字符
 * @param msg 
 * @returns 
 */
function checkHasChn(msg: string) {
    return /[\u2E80-\uDFFF\u{20000}-\u{2FA1F}]/u.test(msg);
}