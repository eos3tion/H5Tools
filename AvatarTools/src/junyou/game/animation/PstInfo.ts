interface Array<T> {
    toData(): any[];
}

Array.prototype.toData = function (): any[] {
    var data = [];
    for (let i = 0, len = this.length; i < len; i++) {
        let item = this[i];
        if (item) {
            data[i] = item.toData();
        } else {
            data[i] = [];
        }
    }
    return data;
}

module junyou.game {


    function getData(obj) {
        var data = {};
        for (let key in obj) {
            data[key] = obj[key].toData();
        }
        return data;
    }
    /**
     * 打包类型
     */
    enum PakSaveType {
        /**全部打包 (未使用)*/
        PAK_ALL = 0,
        /**1 按方向打包 (未使用)*/
        PAK_BY_DIRECTION = 1,
        /**2 按动作打包 */
        PAK_BY_ACTION = 2,
        /**3 混合打包 (未使用)*/
        PAK_COMPLEX = 3,
        /**
         * 单方向单动作
         */
        PAK_ONE_A_D = 4
    }

    var parsers: { [index: number]: { new(key: string): SplitInfo } };

    /**
     * 获取处理器
     */
    function getParsers(t: number): { new(key: string): SplitInfo } {
        if (!parsers) {
            parsers = {};
            parsers[PakSaveType.PAK_ALL] = AllSInfo;
            parsers[PakSaveType.PAK_BY_ACTION] = ActionSInfo;
            parsers[PakSaveType.PAK_ONE_A_D] = OneADSInfo;
            //TODO 其他处理
        }
        return parsers[t];
    }

    /**
     * 存储pst信息
     */
    export class PstInfo {
        /**
    	 * 图片数据字典<br/>
    	 * Key      string  存储图片数据的key <br/>
    	 * Value    UnitResource<br/>
    	 */
        protected _resources: { [index: string]: UnitResource } | UnitResource;

        /**
         * pst的唯一标识
         */
        public key: string;

        /**
         * 动作信息，帧的播放信息的数组
         */
        public frames: { [index: number]: ActionInfo };


        /**
         * 附加信息，如人物的头顶名字高度
         * 施法点，受创点等信息
         * 
         * @type {*}
         */
        public extra: any;

        public splitInfo: SplitInfo;

        private t: number;

        private rawSplitInfo: number;

        constructor() {

        }

        public init(key: string, data: any[]) {
            this.key = key;
            this._resources = {};
            var t = data[0];
            this.t = t;
            var parserRef = getParsers(t);
            var parser = new parserRef(key);
            //处理数据
            this.splitInfo = parser;
            this.rawSplitInfo = data[1];
            parser.parseSplitInfo(data[1]);
            this.frames = parser.parseFrameData(data[2]);
            this.extra = data[3];
        }

        /**
         * 解析图片数据
         * 用于批量处理数据
         */
        public decodeImageDatas(data: { [index: string]: {} }) {
            for (var uri in data) {
                var res = this.getResource(uri);
                res.decodeData(data[uri]);
            }
        }

        getResource(uri: string): UnitResource {
            var res: UnitResource = this._resources[uri];
            if (!res) {
                res = new UnitResource(uri, this.splitInfo);
                this._resources[uri] = res;
            }
            return res;
        }

        /**
         * 获取单位资源
         */
        public getUnitResource(uri): UnitResource {
            var res = this.getResource(uri);
            res.loadData();
            return res;
        }

        toData() {
            let data = [this.t, this.rawSplitInfo, getData(this.frames)];
            if (this.extra) {
                data.push(this.extra);
            }
            return data;
        }

    }

    /**
     * 资源打包分隔信息
     */
    export class SplitInfo {

        /**
         * 资源字典
         */
        protected _resDict: { [index: number]: string };

        /**
         * 子资源列表
         */
        protected _subReses: string[];

        /**
         * key
         */
        protected _key: string;

        /**
         * 动作/方向的字典<br/>
         * key      {string}  资源uri<br/>
         * value    {Array}   action<<8|direction
         *                   
         */
        public adDict: { [index: string]: number[] };

        /**
         * 处理分隔信息
         * @param data
         */
        public parseSplitInfo(data: any[]) {

        }

        constructor(key: string) {
            this._key = key;
        }

        /**
         * 处理帧数据
         * @param data
         */
        public parseFrameData(data: any[]): { [index: number]: ActionInfo } {
            var frames: { [index: number]: ActionInfo } = {};
            for (let key in data) {
                let a = +key;
                frames[a] = ActionInfo.fromData(data[a], a);
            }
            return frames;
        }



        /**
         * 获取文件名字
         */
        protected getFileName(pakInfo: any): string {
            return null;
        }
        /**
         * 根据方向和动作获取原始资源
         * @param direction 方向
         * @param action    动作
         */
        public getResource(direction: number, action: number): string {
            return null;
        }

        /**
         * 得到 A(动作)D(方向)的标识
         * 
         * @static
         * @param {number} action A(动作)标识
         * @param {number} direction D(方向)标识
         * @returns {number} A(动作)D(方向)的标识
         */
        public static getADKey(action: number, direction: number): number {
            return action << 8 | direction;
        }

        /**
         * 从A(动作)D(方向)的标识中获取 A(动作)标识
         * 
         * @static
         * @param {number} adKey A(动作)D(方向)的标识
         * @returns {number} A(动作)标识
         */
        public static getAFromADKey(adKey: number): number {
            return adKey >> 8;
        }

        /**
         * 从A(动作)D(方向)的标识中获取 D(方向)标识
         * 
         * @static
         * @param {number} adKey A(动作)D(方向)的标识
         * @returns {number} D(方向)标识
         */
        public static getDFromADKey(adKey: number): number {
            return adKey & 0xff;
        }

    }

    /**
     * 单方向单动作分隔数据
     */
    export class OneADSInfo extends SplitInfo {
        /**
         * 默认动作数组
         * [a,b,c....x,y,z,A,B,C...X,Y,Z]
         */
        public static _a = function () {
            let a: string[] = [];
            function m(f: number, t: number) {
                for (let i = f; i < t; i++) {
                    a.push(String.fromCharCode(i));
                }
            }
            m(97, 122);//a-z
            m(65, 90);//A-Z
            return a;
        }();

        protected _n: string;
        protected _a: any[];
        protected _d: any[];

        parseFrameData(data: any) {
            this._resDict = {};
            var _adDict: { [index: string]: number[] } = {};
            this.adDict = _adDict;
            var frames: { [index: number]: ActionInfo } = {};
            for (let key in data) {
                let a = +key;
                frames[a] = ActionInfo.fromData(data[a], a);
                for (let d = 0; d < 5; d++) {
                    let res = this.getResource(d, a);
                    _adDict[res] = [SplitInfo.getADKey(a, d)];
                }
            }
            return frames;
        }

        parseSplitInfo(infos: any[]) {
            this._n = infos["n"] || "{a}{d}";
            this._a = infos["a"] || OneADSInfo._a;
            this._d = infos["d"];
        }

        getResource(direction: number, action: number): string {
            let key = SplitInfo.getADKey(action, direction);
            let res = this._resDict[key];
            if (!res) {
                this._resDict[key] = res = this._n.replace(/\{f\}/g, this._key).replace(/\{d\}/g, this.getRep(direction, this._d)).replace(/\{a\}/g, this.getRep(action, this._a));
            }
            return res;
        }

        getRep(data: number, repArr: any[]): string {
            var str = data + "";
            if (repArr && (data in repArr)) {
                str = repArr[data];
            }
            return str;
        }
    }

    /**
     * 基于动作打包的分隔数据
     */
    export class ActionSInfo extends SplitInfo {

        parseSplitInfo(infos: any[]) {
            var flag = true;
            if (infos) {
                this._resDict = {};
                this._subReses = [];
                var _adDict: { [index: string]: number[] } = {};
                this.adDict = _adDict;
                var _resDict = this._resDict;
                var _subReses = this._subReses;
                var len = infos.length;
                for (let i = 0; i < len; i++) {
                    let pak = infos[i][0];
                    let acts = pak.a;
                    if (acts) {
                        let dlen = acts.length;
                        if (dlen) {
                            flag = false;
                            let res = this.getFileName(pak);
                            let arr = _adDict[res];
                            if (!arr) {
                                arr = [];
                                _adDict[res] = arr;
                            }
                            if (res && _subReses.indexOf(res) == -1) {
                                _subReses.push(res);
                            }
                            for (let j = 0; j < dlen; j++) {
                                let a = acts[j];
                                _resDict[a] = res;
                                //push所有动作的数据
                                arr.push(SplitInfo.getADKey(a, 0), SplitInfo.getADKey(a, 1), SplitInfo.getADKey(a, 2), SplitInfo.getADKey(a, 3), SplitInfo.getADKey(a, 4));
                            }
                        }
                    }
                }
            }
            if (flag) {
                throw new Error("no pak split info");
            }
        }


        getFileName(pakInfo: any) {
            var dirs = pakInfo.a;
            return PakSaveType.PAK_BY_ACTION + "-" + dirs.join("_");
        }

        getResource(_direction: number, action: number): string {
            return this._resDict[action];
        }
    }

    export class AllSInfo extends SplitInfo {
        parseSplitInfo(infos: any[]) {
        }
        getResource(): string {
            return "d";
        }

    }
}
