module jy {

    export class Data {

        /**
         * 文件内容
         */
        public static dataFile: string;
        /**
         * 原始数据的字典
         * 
         * @static
         * @type {{ [index: string]: PstInfo }}
         */
        public static pstDict: { [index: string]: PstInfo };

        /**
         * 当前选中的数据
         * 
         * @static
         * @type {{key: string, value: PstInfo }}
         */
        public static selectData: { key: string, value: PstInfo };

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
                let fs = nodeRequire("fs") as typeof import("fs");
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

    function getData(obj) {
        var data = {};
        for (let key in obj) {
            data[key] = getActionData(obj[key]);
        }
        return data;
    }

    function getActionData({ frames }: ActionInfo) {
        let data = [[]] as any;
        let frameData = data[0];
        if (frames) {
            for (let i = 0; i < frames.length; i++) {
                const frame = frames[i];
                if (frame) {
                    let { a, f, t, e, d } = frame;
                    let dat = [+a, +f, +t] as any[];
                    frameData[i] = dat;
                    if (e) {
                        let d3 = e as any;
                        if ((e as any) == +e) {
                            d3 = +e;
                        }
                        dat[3] = d3;
                    }
                    if (d) {
                        if (!dat[3]) {
                            dat[3] = 0;
                        }
                        dat[4] = +d;
                    }
                } else {
                    frameData[i] = 0;
                }
            }
        }
        return data;
    }

    export interface PstInfo {
        toData(): any;
        rawSplitInfo: any;
        /**
         * 附加信息，如人物的头顶名字高度
         * 施法点，受创点等信息
         * 
         * @type {*}
         */
        extra: any;
    }

    PstInfo.prototype.toData = function toData(this: PstInfo) {
        let data = [+this.type, this.rawSplitInfo, getData(this.frames)];
        if (this.extra) {
            data.push(this.extra);
        }
        return data;
    }

    let rawInit = PstInfo.prototype.init;

    PstInfo.prototype.init = function (this: PstInfo, key: string, data: any[]) {
        rawInit.call(this, key, data);
        this.rawSplitInfo = data[1];
    }


    export const FACE_SCALE_X: { [index: number]: number } =
    {
           /*↓*/ 0: 1,
           /*↘*/ 1: 1,
           /*→*/ 2: 1,
           /*↗*/ 3: 1,
           /*↑*/ 4: 1,
           /*↖*/ 5: -1,
           /*←*/ 6: -1,
           /*↙*/ 7: -1
    }

    /**
     * 朝向对应的帧序列
     */
    export const FACE_DIRECTION: number[] = [
        /*0*/0,
        /*1*/1,
        /*2*/2,
        /*3*/3,
        /*4*/4,
        /*5*/3,
        /*6*/2,
        /*7*/1];

    export interface UnitRender {
        playNextFrame();
    }

    UnitRender.prototype.playNextFrame = function (this: UnitRender) {
        let idx = ++this.idx;
        let frames: FrameInfo[] = this.actionInfo.frames;
        if (idx >= frames.length) {
            idx = 0;
        }
        this.willRenderFrame = frames[idx];
        this.idx = idx;
        this.doRender(0);
    }
}
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
