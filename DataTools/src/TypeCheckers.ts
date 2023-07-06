import { decode } from "./ConditionTypeParser.js";

/**
 * 数值类型在解析json的时候，字符串会多两个""，数值更节省
 * 
 * @param {*} value (description)
 * @returns (description)
 */
function tryParseNumber(value: any) {
    if (typeof value === "boolean") {
        return value ? 1 : 0;
    }
    if (value == +value && value.length == (+value + "").length) { // 数值类型
        // "12132123414.12312312"==+"12132123414.12312312"
        // true
        // "12132123414.12312312".length==(+"12132123414.12312312"+"").length
        // false
        return +value;
    } else {
        return value;
    }
}

abstract class AbsTypeChecker implements TypeChecker {
    abstract type: string;
    abstract javaType: string;
    abstract ueType: string;
    abstract idx: number;
    abstract def: any;

    abstract check(value: any): any;

    serverCheck(value: any): any {
        return this.check(value);
    }
    jsonDef?: any;

    getOutValue(v: any, def: any) {
        return [v, def, this.jsonDef, 0].find(v => v !== undefined)
    }
}
/**
 * 处理 any 类型的数据
 * 
 * @class AnyChecker
 * @implements {TypeChecker}
 */
class AnyChecker extends AbsTypeChecker {

    type = "any";

    javaType = "String";

    ueType = "FString"

    def = undefined;

    jsonDef = null;

    idx = TypeCheckerIndex.Any;

    check(value: any) {
        return tryParseNumber(value);
    }
}

/**
 * 处理 string 类型的数据
 * 
 * @class StringChecker
 * @implements {TypeChecker}
 */
class StringChecker extends AbsTypeChecker {

    type = "string";

    javaType = "String";

    ueType = "FString"

    def = "";

    jsonDef = "";

    idx = TypeCheckerIndex.String;

    check(value: string) {
        return value;
    }

}



/**
 * 处理 number 类型的数据
 * 
 * @class NumberChekcer
 * @implements {TypeChecker}
 */
class NumberChekcer extends AbsTypeChecker {
    type = "number";

    javaType = "double";

    ueType = "double";

    def = 0;
    jsonDef = 0;
    idx = TypeCheckerIndex.Number;
    check(value: string) {
        if (!value) {
            return 0;
        }
        value = value + "";
        value = value.trim();
        if (value.split(".").length <= 2 && (/^-?[0-9.]+e[0-9]+$/i.test(value) || /^-?0b[01]+$/.test(value) || /^-?0x[0-9a-f]+$/i.test(value) || /^-?[0-9.]+$/.test(value))) {
            return +value;
        } else {
            throw new ValueTypeError("number", value);
        }
    }
    getOutValue(v: any, def: any) {
        if (v == def) {//此数值类型的列，没有默认值，并且格位上也没有值
            if (v == undefined) {
                return 0;
            } else if (String(v).length <= 2) {
                return v;
            }
        }
        return super.getOutValue(v, def);
    }
}


/**
 * 处理整型
 * 
 * @class Int32Checker
 * @implements {AbsTypeChecker}
 */
class Int32Checker extends NumberChekcer {
    javaType = "int";
    ueType = "int32";
    check(value: string) {
        if (value == undefined) {
            return;
        }
        if (typeof value === "string") {
            value = value.trim();
        } else {
            value = value + "";
        }
        value = value.trim();
        if (!value) {
            return 0;
        }
        if (+value > 2147483647 || +value < -2147483648) {
            throw new ValueTypeError("int32", value, "，超出int32范围-2147483648 ~ 2147483647 ");
        }
        if ((/^-?[0-9]+$/i.test(value) || /^-?0b[01]+$/.test(value) || /^-?0x[0-9a-f]+$/i.test(value))) {
            return +value;
        } else {
            throw new ValueTypeError("int32", value);
        }
    }

}

/**
 * 处理 boolean 类型的数据
 * 
 * @class BooleanChecker
 * @implements {TypeChecker}
 */
class BooleanChecker extends AbsTypeChecker {

    type = "boolean";

    javaType = "bool";

    ueType = "bool";

    def = 0;
    idx = TypeCheckerIndex.Bool;
    solveString = true;
    check(value: string) {
        if (!+value || value == "false") {
            return 0;
        } else {
            return 1;
        }
    }
    serverCheck(value: string) {
        return !!this.check(value);
    }
}


/**
 * 处理 | 类型的数据
 * 
 * @class ArrayCheker
 * @implements {TypeChecker}
 */
class ArrayCheker extends AbsTypeChecker {
    type = "any[]";

    javaType = "Object[]";

    ueType = "TArray<FString>";
    def = undefined;
    idx = TypeCheckerIndex.Array;

    jsonDef = null;

    check(value: string): any {
        if (value) {
            if (Array.isArray(value)) {
                return value;
            }
            if (value.trim() == "") {
                return;
            }
        } else {
            return;
        }
        let arr = value.split(/[:|]/g);
        arr.forEach((item, idx) => {
            arr[idx] = tryParseNumber(item);
        })
        return arr;
    }
}

/**
 * 处理 |: 类型的二维数组的数据
 * 
 * @class Array2DCheker
 * @implements {TypeChecker}
 */
class Array2DCheker extends AbsTypeChecker {
    type = "any[][]";

    javaType = "Object[][]";
    ueType = "TArray<FString>";
    def = undefined;
    idx = TypeCheckerIndex.Array2D;

    jsonDef = null;

    check(value: string): any {
        if (value) {
            if (Array.isArray(value)) {
                return value;
            }
            if (value.trim() == "") {
                return;
            }
        } else {
            return;
        }
        let arr: any[] = value.split("|");
        arr.forEach((item, idx) => {
            let subArr: any[] = item.split(":");
            arr[idx] = subArr;
            subArr.forEach((sitem, idx) => {
                subArr[idx] = tryParseNumber(sitem);
            });
        })
        return arr;
    }
}

function isLeapYear(year: number) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 100 == 0 && year % 400 == 0);
}

const nday = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function checkDate(value: string) {
    let res = /^(20[1-9][0-9])-(0\d+|1[0,1,2])-(\d+)$/.exec(value)
    if (res) {
        var year = +res[1];
        var month = +res[2];
        var day = +res[3];
    } else {
        return false;
    }
    if (day < 1) {
        return false;
    }
    let maxDay: number;
    if (month == 2 && isLeapYear(year)) {
        maxDay = 29;
    } else {
        maxDay = nday[month - 1];
    }
    if (day > maxDay) {
        return false;
    }
    return true;
}

function checkTime(value: string) {
    let res = /^(\d{2}):(\d{2})$/.exec(value)
    if (res) {
        var h = +res[1];
        var m = +res[2];
    } else {
        return null;
    }
    if (h < 0 || h >= 24) {
        return null;
    }
    if (m < 0 || m >= 60) {
        return null;
    }
    return { h: h, m: m };
}

/**
 * 日期检查器 yyyy-MM-dd
 * 
 * @class DateChecker
 * @implements {TypeChecker}
 */
class DateChecker extends AbsTypeChecker {
    type = "Date";

    javaType = "String";
    ueType = "FString";
    def = 0;
    idx = TypeCheckerIndex.Date;

    solveString = true;

    check(value: string) {
        if (!checkDate(value)) {
            throw new ValueTypeError("yyyy-MM-dd", value);
        }
        // 用8位数字代替 10位字符串（JSON后变成12位）
        return new Date(value + " UTC").getTime() * 0.0001;
    }

    serverCheck(value: string) {
        if (!checkDate(value)) {
            throw new ValueTypeError("yyyy-MM-dd", value);
        }
        // 用8位数字代替 10位字符串（JSON后变成12位）
        return value;
    }
}

/**
 * 时间检查器 HH:mm
 * 
 * @class TimeChecker
 * @implements {TypeChecker}
 */
class TimeChecker extends AbsTypeChecker {
    type = "TimeVO";

    javaType = "String";
    ueType = "FString";
    def = 0;

    idx = TypeCheckerIndex.Time;
    solveString = true;
    check(value: string) {
        let time = checkTime(value);
        if (!time) {
            throw new ValueTypeError("HH:mm", value);
        }
        return time.h << 6 | time.m;
    }

    serverCheck(value: string) {
        let time = checkTime(value);
        if (!time) {
            throw new ValueTypeError("HH:mm", value);
        }
        // 用8位数字代替 10位字符串（JSON后变成12位）
        return value;
    }
}

/**
 * 日期时间检查器 yyyy-MM-dd HH:mm
 * 
 * @class DateTimeChecker
 * @implements {TypeChecker}
 */
class DateTimeChecker extends AbsTypeChecker {
    type = "Date";

    javaType = "String";
    ueType = "FString";
    def = 0;
    idx = TypeCheckerIndex.DateTime;
    solveString = true;
    check(value: string) {
        let t = value.split(" ");
        let date = t[0];
        let time = t[1];
        if (!checkDate(date) || !checkTime(time)) {
            throw new ValueTypeError("yyyy-MM-dd HH:mm", value);
        }
        // 使用UTC时间进行存储，解析的时候，改用服务器时区
        return new Date(value + " UTC").getTime() * 0.0001;
    }

    serverCheck(value: string) {
        let t = value.split(" ");
        let date = t[0];
        let time = t[1];
        if (!checkDate(date) || !checkTime(time)) {
            throw new ValueTypeError("yyyy-MM-dd HH:mm", value);
        }
        // 用8位数字代替 10位字符串（JSON后变成12位）
        return value;
    }
}


class ConditionChecker extends AbsTypeChecker {
    type = "Condition";
    javaType = "String";
    ueType = "FString";
    def = undefined;
    idx = TypeCheckerIndex.Condition;
    solveString = true;

    jsonDef = "";
    check(value: string) {
        decode(value);
        return value;
    }
    serverCheck(value: string) {
        let data = decode(value);
        return JSON.stringify(data);
    }
}

class UENameChecker extends AbsTypeChecker {
    type = "string";
    javaType = "String";
    ueType = "FName";

    idx = TypeCheckerIndex.String;
    def = "";

    jsonDef = "";
    check(value: string) {
        return value;
    }
}

class UEPathChecker extends AbsTypeChecker {
    type = "string";
    javaType = "String";
    ueType = "FSoftObjectPath";

    idx = TypeCheckerIndex.String;
    def = "";

    jsonDef = "";
    check(value: string) {
        return value;
    }
}

/**
 * 用于支持灵娱的数组
 * 
 * @class LingYuArrayChecker
 * @extends {AbsTypeChecker}
 */
class LingYuArrayChecker extends AbsTypeChecker {
    type = "any[]";
    javaType = "String";
    ueType = "FString";
    def = undefined;

    idx = TypeCheckerIndex.Array;
    check(value: string): any {
        if (value.trim() == "") {
            return;
        }
        //灵娱的数组使用
        // [] ;  : 分隔   其中  [] 为最高级  ; 为第二级别  : 最低级
        let main = get1Arr(value);
        if (main) {
            main.forEach((subValue, idx) => {
                let sub = get2Arr(subValue);
                if (sub) {
                    main[idx] = sub;
                }
            })
            return main;
        } else {
            return get2Arr(value);
        }
        function get1Arr(value: string) {
            //检查第一级 []
            const reg = /\[(.*?)\]/gi;
            if (reg.test(value)) {
                reg.lastIndex = 0;
                let res: RegExpExecArray;
                let arr = [];
                while (res = reg.exec(value)) {
                    arr.push(res[1]);
                }
                return arr;
            }
        }
        function get2Arr(value: string) {
            let sub = getSpArrFun(value, ";") as any[];
            if (sub) {
                sub.forEach((subValue, idx) => {
                    let ssub = get3Arr(subValue);
                    if (ssub) {
                        sub[idx] = ssub;
                    }
                })
                return sub;
            } else {
                return get3Arr(value);
            }
        }

        function getSpArrFun(value: string, sp: string | RegExp) {
            if (typeof value != "string" || value.trim() == "") {
                return;
            }
            //检查是否有  ;
            if (value.search(sp)) {
                let arr = value.split(sp);
                arr.forEach((item, idx) => {
                    arr[idx] = tryParseNumber(item);
                });
                return arr;
            }
        }
        function get3Arr(value: string) {
            return getSpArrFun(value, /:|,|\|/g);
        }
    }
    serverCheck(value: string) {
        return value;
    }
}
/**
 * ValueTypeError
 */
class ValueTypeError extends Error {
    constructor(type: string, value: string, err: string = "") {
        super();
        this.message = `数据和类型不匹配，当前类型：${type}，数据：${value}${err}`;
    }
}

let checkers: { [index: string]: TypeChecker } = {};
// number	string	boolean	:	|:	yyyy-MM-dd	yyyy-MM-dd HH:mm HH:mm

checkers[TypeCheckerKey.Any] = new AnyChecker;
checkers[TypeCheckerKey.Number] = new NumberChekcer;
checkers[TypeCheckerKey.String] = new StringChecker;
checkers[TypeCheckerKey.Bool] = new BooleanChecker;
checkers[TypeCheckerKey.Array1] = new ArrayCheker;
checkers[TypeCheckerKey.Array2] = new ArrayCheker;
checkers[TypeCheckerKey.Array2D] = new Array2DCheker;
checkers[TypeCheckerKey.Date] = new DateChecker;
checkers[TypeCheckerKey.Time] = new TimeChecker;
checkers[TypeCheckerKey.DateTime] = new DateTimeChecker;
checkers[TypeCheckerKey.Int] = new Int32Checker;
checkers[TypeCheckerKey.Condition] = new ConditionChecker;


checkers[TypeCheckerKey.UEPath] = new UEPathChecker;
checkers[TypeCheckerKey.UEName] = new UENameChecker;

checkers[TypeCheckerKey.LingYuArray] = new LingYuArrayChecker;

export default TypeChecker;
export { checkers as TypeCheckers };
export { ValueTypeError };