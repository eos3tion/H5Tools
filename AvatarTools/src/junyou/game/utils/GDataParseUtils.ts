module junyou.mvc {
    import Point = egret.Point;

	/**
	 * 处理游戏数据
	 * @author 3tion
	 *
	 */
    export class GDataParseUtils {
        public constructor() {
        }


        /**
         * @see junyou.DataParseUtil.parseDatas
         */
        public static parseDatas = DataParseUtil.parseDatas;

        /**
         * 按标准  x坐标(整数类型):y坐标(整数类型)|x坐标(整数类型):y坐标(整数类型)|x坐标(整数类型):y坐标(整数类型)... 转换成坐标点集
         * @param data
         * @param outVector		用来装载点集的数组
         * @param errorMsg		如果有错误的报错信息
         *
         */
        public static convertZuobiaoList(data: string, outVector: Point[], errorMsg: string): void {
            if (data) {
                if (DEBUG) {
                    var error: Boolean = false;
                }
                for (let zuobiao of data.split("|")) {
                    var zuobiaoList: any[] = zuobiao.split(":");
                    if (zuobiaoList.length == 2) {
                        var x = zuobiaoList[0];
                        var y = zuobiaoList[1];
                        if (DEBUG) {
                            if (+x != x || +y != y) {
                                error = true;
                            }
                        }
                        outVector.push(new Point(+x, +y));
                    }
                    else if (DEBUG) {
                        error = true;
                    }
                }
                if (DEBUG) {
                    if (error) {
                        ThrowError(errorMsg + "格式不符合 x坐标(整数类型):y坐标(整数类型)|x坐标(整数类型):y坐标(整数类型)|x坐标(整数类型):y坐标(整数类型)", 0, 1, 7, 8);
                    }
                }
            }
        }

        /**
         * xAttribute的正则
         */
        private static xReg: RegExp = /^x\d+$/;

        /**
         * 解析配置为"x1""x2"....."x100"这样的属性  横向配置
         * @param from		被解析的配置数据
         * @param xattr		最终会变成  xattr.x1=100  xattr.x2=123这样的数据
         *
         */
        public static parseXAttribute(from: Object, xattr: Object): number {
            var keyCount = 0;
            for (let key in from) {
                if (this.xReg.test(key)) {
                    keyCount++;
                    xattr[key] = from[key];
                }
            }
            return keyCount;
        }

        /**
         * 解析配置为 pro1  provalue1   pro2  provalue2 ..... pro100 provalue100  这样的纵向配置属性的配置
         * @param from
         * @param xattr
         * @param keyPrefix
         * @param valuePrefix
         *
         */
        public static parseXAttribute1(from: Object, xattr: Object, errPrefix: string, keyPrefix: string = "pro", valuePrefix: string = "provalue"): number {
            var xReg: RegExp = new RegExp("^" + keyPrefix + "(\\d+)$");
            if (DEBUG) {
                var repeatedErr: string = "";
            }
            var keyCount = 0;
            for (let key in from) {
                var obj: Object = xReg.exec(key);
                if (obj) {
                    var idx = +(obj[1]) || 0;
                    var valueKey: string = valuePrefix + idx;
                    if (DEBUG) {
                        if (key in xattr) {
                            repeatedErr += key + " ";
                        }
                    }
                    keyCount++;
                    xattr[from[key]] = +(from[valueKey]) || 0;
                }
            }
            if (DEBUG) {
                if (repeatedErr) {
                    ThrowError(errPrefix + "有重复的属性值:" + repeatedErr);
                }
            }
            return keyCount;
        }
    }
}
