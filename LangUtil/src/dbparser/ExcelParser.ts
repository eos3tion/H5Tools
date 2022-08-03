import $XLSX = require("xlsx");
import NoModule from "../NoModule";

declare var XLSX: typeof $XLSX;
/**
 * 正常数据内容，列表数据
 */
const SHEET_MAIN = "导出";
const START_ROW = "配置从这一行开始";
/**
 * 基于君游`code.xlsx`的Excel规范的数据处理器
 * 
 * @export
 * @class ExcelParser
 */
export class ExcelParser implements DataBaseParser {

    private headerData: any;
    async getData(url: string) {
        //自动尝试执行svn更新和锁定文件
        let errMsg = lock(url);
        if (errMsg) {
            if (confirm(`执行SVN 更新并锁定${url}时出现错误：\n${errMsg}\n是否终止后续操作？`)) {
                return;
            }
            alert(`为了确保文件修改正确，请手动锁定${url}`);
        }

        const fs = nodeRequire("fs") as typeof import("fs");
        let modules = new Map<string, DataModule>();
        if (fs.existsSync(url)) {
            let data = fs.readFileSync(url, "base64");
            let wb = XLSX.read(data);
            var sheet1Data = wb.Sheets[SHEET_MAIN];
            let lines = XLSX.utils.sheet_to_json(sheet1Data, { header: 1 }) as ExcelRow[];
            let len = lines.length;
            let startRow = -1;
            let headerData = [];
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
            this.headerData = headerData;

            if (startRow == -1) {
                Logger.log(`没有找到数据起始列：${START_ROW}`);
            } else {
                let lastModule: string;
                for (let i = startRow; i < len; i++) {
                    let line = lines[i];
                    if (line) {
                        if (line.length == 0) {
                            lastModule = undefined;
                        }
                        //检查行首数据
                        if (line.length == 1) {
                            lastModule = line[0] || lastModule;
                        }
                        let code = line[1];
                        if (code) {
                            if (!lastModule) {
                                lastModule = NoModule.getNoModuleKey();
                            }
                            let md = modules.get(lastModule);
                            if (!md) {
                                md = [] as DataModule;
                                md.module = lastModule;
                                modules.set(lastModule, md);
                            }
                            md.push({ code, msg: parseReturn(line[2]), path: line[3], module: line[4], raw: line })
                        }
                    }
                }
            }
        }
        return modules;
        function lock(url: string) {
            let cp = nodeRequire("child_process") as typeof import("child_process");
            //先执行svn更新

            let result = cp.spawnSync("svn", ["update", url], { encoding: "utf8" });
            let stdout = result.stdout;
            if (result.status || !~stdout.indexOf("At revision")) {
                Logger.error(`执行更新${url}出现错误，exitCode:${result.status}\n[stdout]:\t${stdout}\n[stderr]:\t${result.stderr}`, result.error);
                return `执行更新${url}出现错误`;
            }
            //进行锁定
            result = cp.spawnSync("svn", ["lock", url]);
            stdout = result.stdout;
            if (result.status || !~stdout.indexOf("locked by")) {
                Logger.error(`执行锁定${url}出现错误，exitCode:${result.status}\n[stdout]:\t${stdout}\n[stderr]:\t${result.stderr}`, result.error);
                return `执行锁定${url}出现错误`;
            }
        }
    }
    async setData(url: string, map: Map<string, DataModule>) {
        //存储数据
        let output = [];
        const headerData = this.headerData;
        for (let i = 0; i < headerData.length; i++) {
            output[i] = headerData[i];
        }
        let startRow = output.length;
        let isFirst = true;
        map.forEach(datas => {
            let mod = datas.module;
            if (NoModule.isNoModule(mod)) {
                mod = undefined;
            }
            if (isFirst) {
                isFirst = false;
            } else {
                output.push([], []);
                if (mod) {
                    //多空两行
                    output.push([mod]);
                }
            }
            for (let i = 0; i < datas.length; i++) {
                let data = datas[i];
                let raw = data.raw;
                let dat = raw ? raw.slice() : [];
                dat[0] = undefined;
                dat[1] = data.code;
                dat[2] = parseReturn(data.msg);
                dat[3] = data.path;
                dat[4] = mod;
                output.push(dat);
            }
        });
        if (output.length > startRow) {
            output[startRow][0] = START_ROW;
        } else {
            output[startRow] = [START_ROW];
        }

        //写入数据
        let wb = {
            SheetNames: [SHEET_MAIN],
            Sheets: {
                [SHEET_MAIN]: sheet_from_array_of_arrays(output)
            }
        }

        var dat = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'buffer' });
        const fs = nodeRequire("fs") as typeof import("fs");
        fs.writeFileSync(url, dat);
        //错误由外层做错误处理

        let msg = unlock(url);
        if (msg) {
            alert(msg);
        }


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

        function unlock(url: string) {
            let cp = nodeRequire("child_process") as typeof import("child_process");
            let result = cp.spawnSync("svn", ["unlock", url], { encoding: "utf8" });
            let stdout = result.stdout;
            if (result.status || !~stdout.indexOf("unlocked")) {
                Logger.error(`执行解锁${url}出现错误，exitCode:${result.status}\n[stdout]:\t${stdout}\n[stderr]:\t${result.stderr}`, result.error);
                return `执行解锁${url}出现错误，请手动解锁`;
            }
        }
    }
}

function parseReturn(msg: string) {
    return msg ? msg.replace(/&#10;/g, "\n").replace(/&#13;/g, "\r").replace(/(\r|\n)+/g, "\n") : "";
}
