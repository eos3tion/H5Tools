module junyou {

    interface Path {
        path: string,
        iPrefix?: boolean
    }

    interface JConfig {
        params?: {},
        prefixes: string[],
        paths: {
            res: Path,
            skin: Path
        };
    }

    /**
     * 配置工具
     * @author 3tion
     * @export
     * @class ConfigUtils
     */
    export class ConfigUtils {

        /**
         * 配置数据
         */
        private static _data: JConfig;

        /**
         * 资源的hash配置
         */
        private static _hash: { [index: string]: string };


        /**
         * 设置配置数据
         * 
         * @static
         * @param {JConfig} data 配置
         */
        public static setData(data: JConfig) {
            this._data = data;
        }


        /**
         * 获取资源完整路径
         * 
         * @static
         * @param {string} uri                  路径标识
         * @param {Boolean} [sameDomain=false]  是否为同域，同域的话，资源从resource中获取
         * @returns {string}
         */
        public static getResUrl(uri: string, sameDomain: Boolean = false): string {
            if (sameDomain) {
                return "resource/" + uri;
            }
            var hash = this._hash;
            if (hash) {
                var ver: string = hash[uri];
                if (ver) {
                    if (uri.indexOf("?") == -1) {
                        uri = uri + "?" + ver;
                    }
                    else {
                        uri = uri + "&jyver=" + ver;
                    }
                }
            }
            return this.getUrlWithPath(uri, this._data.paths.res);
        }

        /**
         * 通过Path获取完整url
         * 
         * @private
         * @static
         * @param {string} uri 路径标识
         * @param {Path} path Path对象
         * @returns
         */
        private static getUrlWithPath(uri: string, path: Path) {
            uri = path.path + uri;
            var prefix = path.iPrefix ? "" : this.getPrefix(uri);
            return prefix + uri;
        }

        /**
         * 根据资源标识获取网址前缀
         */
        public static getPrefix(uri: string): string {
            var prefixes = this._data.prefixes;
            var idx = uri.hash() % prefixes.length;
            return prefixes[idx] || "";
        }

        /**
         * 获取参数
         */
        public static getParam(key: string): any {
            return this._data.params[key];
        }

        /**
         * 获取皮肤文件地址
         */
        public static getSkinFile(key: string, fileName: string) {
            return this.getUrlWithPath(key + "/" + fileName, this._data.paths.skin);
        }

    }

    export function createObjectFromArray<T>(ref: { new (): T }, keys: string[], data: any[]): T {
        var obj = new ref();
        for (let i = 0, len = keys.length; i < len; i++) {
            let key = keys[i];
            // if (key in obj) { TS -> JS 对象未赋值的属性不会初始化
            if (i in data) {
                obj[key] = data[i];
            }
            // }
        }
        return obj;
    }
}