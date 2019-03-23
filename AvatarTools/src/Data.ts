module junyou.tools {

    export class Data {

        /**
         * 文件内容
         */
        public static dataFile: string;
        /**
         * 原始数据的字典
         * 
         * @static
         * @type {{ [index: string]: junyou.game.PstInfo }}
         */
        public static pstDict: { [index: string]: junyou.game.PstInfo };

        /**
         * 当前选中的数据
         * 
         * @static
         * @type {{key: string, value: junyou.game.PstInfo }}
         */
        public static selectData: { key: string, value: junyou.game.PstInfo };

        /**
         * 存储数据
         * 
         * @static
         */
        public static saveData() {
            try {
                var obj = {};
                var dict = Data.pstDict;
                for (var k in dict) {
                    obj[k] = dict[k].toData();
                }
                // 存储文件        
                fs.writeFileSync(Data.dataFile, JSON.stringify(obj));
                alert("保存成功");
            }
            catch (e) {
                alert("保存文件失败！");
                throw e; // 让错误可以调试
            }
        }
    }
}