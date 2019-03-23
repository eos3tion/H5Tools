module junyou {
	/**
	 * 配置加载器<br/>
     * 用于预加载数据的解析
	 * @author 3tion
	 *
	 */
    export class DataLocator {

        private static parsers: { [index: string]: ConfigDataParser } = {};

        private static data: { [index: string]: any } = {};


        /**
         * 注册配置解析
         * @param key       配置的标识
         * @param parser    解析器
         */
        public static regParser(key: string, parser: ConfigDataParser) {
            this.parsers[key] = parser;
        }


		// /**
		//  * 所有配置为独立文件解析所有数据
		//  */
        // public static parseDatas() {
        //     var parsers = this.parsers;
        //     for (let key in parsers) {
        //         let parser = parsers[key];
        //         this.data[key] = parser(RES.getRes(key));
        //         RES.destroyRes(key);
        //     }
        // }

        // /**
        //  * 解析打包的配置
        //  */
        // public static parsePakedDatas() {
        //     let configs = RES.getRes("configs");
        //     RES.destroyRes("configs");
        //     var parsers = this.parsers;
        //     for (let key in parsers) {
        //         let parser = parsers[key];
        //         this.data[key] = parser(configs[key]);
        //     }
        // }

        /**
         * 根据标识获取配置数据
         * @param key   标识
         */
        public static getData(key: string) {
            return this.data[key];
        }

        /**
         * 注册通过H5ExcelTool导出的数据并且有唯一标识的使用此方法注册
         * @param {string}              key             数据的标识
         * @param {{ new (): ICfg }}    CfgCreator      配置的类名
         * @param {string}              [idkey="id"]    唯一标识
         */
        public static regCommonParser(key: string, CfgCreator: { new (): ICfg }, idkey: string = "id") {
            this.regParser(key, (data: any): any => {
                let dict = {};
                DataParseUtil.copyDataListForCfg(CfgCreator, data, this.commonParserForEach, this, [dict, idkey, key]);
                return dict;
            });
        }

        private static commonParserForEach(t: ICfg, args: any[], idx?: number) {
            let dict = args[0];
            let idKey = args[1];
            if (idKey in t) {
                let id = t[idKey];
                if (DEBUG) {
                    if (typeof id === "object") {
                        ThrowError(`配置${args[2]}的数据有误，唯一标识${idKey}不能为对象`);
                    }
                    if (id in dict) {
                        ThrowError(`配置${args[2]}的数据有误，唯一标识${idKey}有重复值：${id}`);
                    }
                }
                dict[id] = t;
                return true;
            } else {
                if (DEBUG) {
                    ThrowError(`配置${args[2]}解析有误，无法找到指定的唯一标示：${idKey}，数据索引：${idx}`);
                }
                return false;
            }
        }
    }



	/**
	 * 配置数据解析函数
	 */
    export interface ConfigDataParser {
        (data: any): any;
    }
}
