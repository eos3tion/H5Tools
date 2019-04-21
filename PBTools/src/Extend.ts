
/**
 * 文档是否加载好
 * 
 * @param {{ (e?: UIEvent): void }} fn (description)
 */
function ready(fn: { (e?: UIEvent): void }) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}
/**
 * 对数字进行补0操作
 * @param value 要补0的数值
 * @param length 要补的总长度
 * @return 补0之后的字符串
 */
function zeroize(value: number | string, length: number = 2): string {
    let str = "" + value;
    let zeros = "";
    for (let i = 0, len = length - str.length; i < len; i++) {
        zeros += "0";
    }
    return zeros + str;
}
/****************************************扩展Object****************************************/
interface Object {
    /**
     * 将数据拷贝到 to
     * @param to 目标
     */
    copyto(to: Object);
    /**
     * 获取指定属性的描述，会查找当前数据和原型数据
     * @param property 指定的属性名字
     */
    getPropertyDescriptor(property: string): PropertyDescriptor;
}

Object.defineProperties(Object.prototype, {
    "getPropertyDescriptor": {
        value: function (property: string): any {
            var data = Object.getOwnPropertyDescriptor(this, property);
            if (data) {
                return data;
            }
            var prototype = Object.getPrototypeOf(this);
            if (prototype) {
                return prototype.getPropertyDescriptor(property);
            }
            return null;
        },
        enumerable: false
    },
    "copyto": {
        value: function (to: Object) {
            for (let p in this) {
                var data: PropertyDescriptor = to.getPropertyDescriptor(p);
                if (data && data.set) {
                    to[p] = this[p];
                }
            }
        },
        enumerable: false
    }
});

/****************************************扩展Math****************************************/
interface Math {
    /**
     * 让数值处于指定的最大值和最小值之间，低于最小值取最小值，高于最大值取最大值
     * @param value 要处理的数值
     * @param min   最小值
     * @param max   最大值
     */
    clamp: (value: number, min: number, max: number) => number;

}

Math.clamp = (value, min, max) => {
    if (value < min) {
        value = min;
    }
    if (value > max) {
        value = max;
    }
    return value;
}

/****************************************扩展Number********************************************/
interface Number {
    /**
     * 对数字进行补0操作
     * @param length 要补的总长度
     * @return 补0之后的字符串
     */
    zeroize(length: number): string;
}

Object.defineProperties(Number.prototype, {
    "zeroize": {
        value: function (length) { return zeroize(this, length) },
        enumerable: false
    }
});

/****************************************扩展String****************************************/
interface String {
    /**
     * 替换字符串中{0}{1}{2}{a} {b}这样的数据，用obj对应key替换，或者是数组中对应key的数据替换
     */
    substitute(...args): string;
    /**
     * 对数字进行补0操作
     * @param length 要补的总长度
     * @return 补0之后的字符串
     */
    zeroize(length: number): string;
}


Object.defineProperties(String.prototype, {
    "zeroize": {
        value: function (length) { return zeroize(this, length) },
        enumerable: false
    },
    "substitute": {
        value: function () {
            var len = arguments.length;
            if (len > 0) {
                var obj;
                if (len == 1) {
                    obj = arguments[0];
                    if (typeof obj !== "object") {
                        obj = arguments;
                    }
                } else {
                    obj = arguments;
                }

                if ((obj instanceof Object) && !(obj instanceof RegExp)) {
                    return this.replace(/\{([^{}]+)\}/g, function (match, key) {
                        var value = obj[key];
                        return (value !== undefined) ? '' + value : '';
                    });
                }
            }
            return this;
        },
        enumerable: false
    }
});
interface StringConstructor {
    /**
     * 对数字进行补0操作
     * @param value 要补0的数值
     * @param length 要补的总长度
     * @return 补0之后的字符串
     */
    zeroize: (value: number, length: number) => string;

}

String["zeroize"] = zeroize;

/****************************************扩展Date****************************************/


interface Date {
    /**
     * 格式化日期
     */
    format(mask: string): string;
}

Object.defineProperties(Date.prototype, {
    "format": {
        value: function (mask) {
            let d = this;
            return mask.replace(/"[^"]*"|'[^']*'|(?:d{1,2}|m{1,2}|yy(?:yy)?|([hHMs])\1?)/g, function ($0) {
                switch ($0) {
                    case "d": return d.getDate();
                    case "dd": return zeroize(d.getDate());
                    case "M": return d.getMonth() + 1;
                    case "MM": return zeroize(d.getMonth() + 1);
                    case "yy": return String(d.getFullYear()).substr(2);
                    case "yyyy": return d.getFullYear();
                    case "h": return d.getHours() % 12 || 12;
                    case "hh": return zeroize(d.getHours() % 12 || 12);
                    case "H": return d.getHours();
                    case "HH": return zeroize(d.getHours());
                    case "m": return d.getMinutes();
                    case "mm": return zeroize(d.getMinutes());
                    case "s": return d.getSeconds();
                    case "ss": return zeroize(d.getSeconds());
                    default: return $0.substr(1, $0.length - 2);
                }
            });
        },
        enumerable: false
    }
});


interface Array<T> {
    /**
     * 如果数组中没有要放入的对象，则将对象放入数组
     * 
     * @param {T} t 要放入的对象
     */
    pushOnce(t: T);

    /**
    * 
    * 删除某个数据
    * @param {T} t
    * @returns {boolean}   true 有这个数据并且删除成功
    *                      false 没有这个数据
    */
    remove(t: T): boolean;
}

Object.defineProperties(Array.prototype, {
    pushOnce: {
        value: function (t) {
            if (!~this.indexOf(t)) {
                this.push(t);
            }
        },
        enumerable: false
    },
    remove: {
        value: function (t) {
            let idx = this.indexOf(t);
            if (~idx) {
                this.splice(idx, 1);
                return true;
            }
            return false;
        },
        enumerable: false
    }
});