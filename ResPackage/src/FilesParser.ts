import { Core } from "./Core";
import { PngParser } from "./PngParser";
import _path = require("path");
import _fs = require("fs");
import { FsExtra } from "./FsExtra";
import { PngQuant } from "./PngQuant";

interface PngParserList extends Array<PngParser> {
    direction: number;
    action: number;
    maxFrame: number;
}

/**
 * 用于将文件列表处理成游戏使用的数据
 * 
 * @export
 * @class FileParser
 */
export class FilesParser {
    private _paths: string[];

    private _current: PromiseControl;

    private _dir: string;

    private _name: string;

    private _outDir: string;
    private _canvas: HTMLCanvasElement;
    private _ctx: CanvasRenderingContext2D;
    constructor() {
        let canvas = document.createElement("canvas");
        this._ctx = canvas.getContext("2d");
        this._canvas = canvas;
    }

    /**
     * 设置文件目录
     * 
     * @param {string} dir
     * @returns
     */
    setDir(dir: string) {
        this._dir = dir;
        const path: typeof _path = nodeRequire("path");
        let ret = path.parse(dir);
        this._name = ret.base;

        let outpath = Core.outpath;
        if (outpath) {
            outpath = path.join(outpath, this._name);
        } else {//默认在原文件夹使用 .out
            outpath = path.join(dir, Core.defaultOut);
        }
        FsExtra.mkdirs(outpath);
        this._outDir = outpath;

        return this;
    }

    /**
     * 设置要处理的图片文件
     * 
     * @param {string[]} paths
     * @returns
     */
    setPaths(paths: string[]) {
        this._paths = paths;
        return this;
    }

    /**
     * 停止当前正在进行的处理
     */
    stop() {
        let c = this._current;
        if (c) {
            c.stop = true;
        }
    }

    async execute() {
        Core.progress.reset();
        const outDir = this._outDir;
        const fs: typeof _fs = nodeRequire("fs");
        const path: typeof _path = nodeRequire("path");
        // 预处理
        let paths = this._paths;
        let pngs: PngParser[] = [];
        let j = 0;
        let isPak = Core.mode == Mode.Pak;
        const pathUtil: typeof _path = nodeRequire("path");
        for (let i = 0; i < paths.length; i++) {
            let path = paths[i];
            let ret = pathUtil.parse(path);
            let ext = ret.ext;
            if (ext != ".png") {// 输入图片必须为png
                continue;
            }
            let name = ret.name;
            let direction = 0, action = 0, frame: number;
            if (isPak) {// 有方向
                direction = +name.substring(0, 2);
                name = name.substring(2);
                let idx = +name;
                if (name != <any>idx) {// 不符合命名规则
                    throw Error(`[${ret.name}]序列帧图片不符合命名规则，图片前2位数字标识方向，后面的数字代表动作，单个动作最多支持64帧`);
                }
                //由以往项目来看，还未用到超过64帧的单个动作，所以只支持最多64帧的动作
                action = idx / 64 | 0;
                frame = idx - action * 64;
            }
            let parser = new PngParser();
            let image = parser.image;
            image.path = path;
            image.direction = direction;
            image.action = action;
            image.frame = frame;
            image.name = name;
            pngs[j++] = parser;
            Core.progress.addTask();
        }

        if (!isPak) {//ani直接使用文件名进行排序
            pngs.sort((a, b) => a.image.name > b.image.name ? 1 : -1);
            //设置png帧数
            for (let i = 0; i < pngs.length; i++) {
                pngs[i].image.frame = i;
            }
        }


        let dict: { [index: string]: PngParserList } = {};
        for (let i = 0; i < j; i++) {
            let parser = pngs[i];
            let image = parser.image;
            let key = this.getKey(image);
            let arr = dict[key];
            if (!arr) {
                dict[key] = arr = <PngParserList>[];
                arr.direction = image.direction;
                arr.action = image.action;
                arr.maxFrame = 0;
            }
            if (image.frame > arr.maxFrame) {
                arr.maxFrame = image.frame;
            }
            arr[image.frame] = parser;
        }
        const pakSaveType = Core.pakSaveType;
        if (isPak && pakSaveType == PakSaveType.PAK_ALL) {
            let arr = [] as Array<PngParser>;
            let j = 0;
            for (let key in dict) {
                let tmp = dict[key];
                tmp.forEach(f => {
                    arr[j++] = f;
                })
            }
            await this.parseFile(arr, "d")
        } else {
            for (let key in dict) {
                await this.parseFile(dict[key], key);
            }
        }
        //pst动作信息
        let pstDict: { [action: number]: { [direction: number]: number[] } } = {};

        //纹理数据 ImageData
        let texDict: { [action: number]: { [direction: number]: number[] } } = {};
        let defaultFrameTime = Core.defaultFrameTime;

        for (let key in dict) {
            let arr = dict[key];
            //得到帧数据 frameData
            let { action, direction, maxFrame } = arr;
            let pstadata = pstDict[action];
            if (!pstadata) {
                pstDict[action] = pstadata = [];
            }
            let texadata = texDict[action];
            if (!texadata) {
                texDict[action] = texadata = [];
            }

            let pstddata = pstadata[0] as any;
            if (!pstddata) {//数据只存放在方向0上
                pstadata[0] = pstddata = [];
                for (let i = 0; i <= maxFrame; i++) {
                    pstddata[i] = [action, i, defaultFrameTime];
                }
            }
            let texddata;
            texadata[direction] = texddata = [];
            for (let i = 0, j = 0; i <= maxFrame; i++) {
                let png = arr[i];
                texddata[j] = png ? png.getImageData() : 0;
                j++;
            }
        }
        for (let key in texDict) {
            let texadata = texDict[key] as any as number[];
            for (let i = 0; i < texadata.length; i++) {
                texadata[i] = texadata[i] || 0;
            }
        }
        let pst = [pakSaveType, [], pstDict];
        // 存储数据
        if (isPak) {
            //pak，pst数据和 纹理数据分开存储
            saveData("d.json", texDict);
            saveData("pst.json", { [this._name]: pst });
        } else {
            //数据文件和图片保存相同文件夹
            saveData("d.json", [pst, texDict]);
        }

        function saveData(fileName: string, data: any) {
            let outpath = path.join(outDir, fileName);
            fs.writeFileSync(outpath, JSON.stringify(data));
            Core.log(`数据生成成功：${outpath}`, "#0f0");
        }
    }
    getKey(data: { action?: number, direction?: number }) {
        return Core.nameRep.substitute({
            a: this.getA(data.action),
            d: data.direction
        });
    }

    repArr = Array.from("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    getA(action: number) {
        let str = "";
        let repArr = this.repArr;
        let len = repArr.length;
        do {
            str = repArr[action % len] + str;
            action = action / len >> 0;
        } while (action)
        return str;
    }

    parseFile(files: Array<PngParser>, key: string) {
        return new Promise((resolve, reject) => {
            console.time(key);
            let c = <PromiseControl>{};
            this._current = c;
            let p: Promise<{}>[] = [];
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file) {
                    p.push(file.checkFile(c));
                }
            }
            Promise.all(p).then(() => {
                if (c.stop) {
                    throw PromiseControlState.ExternalStop;
                }
                let re = this.packing(files.concat());
                if (!re) {
                    throw Error("装箱失败");
                }
                const { width, height, blocks } = re;
                let canvas = this._canvas;
                let ctx = this._ctx;
                canvas.width = width;
                canvas.height = height;
                let imgData = ctx.createImageData(width, height);
                let buffer = imgData.data;
                for (let i = 0; i < blocks.length; i++) {
                    let block = <PngParser>blocks[i];
                    if (block instanceof EmptyBlock) {
                        continue;
                    }
                    let { x, y } = block.fit;
                    let { w, h, image } = block;
                    let tmp = image.data;
                    image.x = x;
                    image.y = y;
                    //清除内存引用，以便函数执行完成后，image的buffer被回收
                    image.data = undefined;
                    let idx = 0;
                    for (let r = 0; r < h; r++) {
                        let ty = y + r;
                        for (let c = 0; c < w; c++) {
                            let tx = x + c;
                            //nativeImage的数据为bgra 而Canvas的数据为 rgba
                            //其中nativeImage种的bgr的值是和alpha乘积后的结果
                            let gidx = (ty * width + tx) * 4;

                            let a = tmp[idx + 3];
                            //不对255/a做预处理是为了减少浮点运算时一些位的精度被消除
                            let b = Math.round(tmp[idx] * 255 / a);
                            let g = Math.round(tmp[idx + 1] * 255 / a);
                            let r = Math.round(tmp[idx + 2] * 255 / a);

                            buffer[gidx] = r;
                            buffer[gidx + 1] = g;
                            buffer[gidx + 2] = b;
                            buffer[gidx + 3] = a;

                            idx += 4;
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);

                if (Core.DEBUG) {
                    //用于debug图片
                    for (let i = 0; i < blocks.length; i++) {
                        let block = <PngParser>blocks[i];
                        let { x, y } = block.fit;
                        let { image } = block;
                        ctx.strokeText(image.name + "\n" + image.frame, x, y + 30);
                    }
                }
                const fs: typeof _fs = nodeRequire("fs");
                const path: typeof _path = nodeRequire("path");
                //生成webp格式图片 "data:image/webp;base64,".length = 23
                let dataUrl = canvas.toDataURL("image/webp", 0.75).slice(23);
                let outpath = path.join(this._outDir, `${key}.png.webp`);
                fs.writeFileSync(outpath, new Buffer(dataUrl, "base64"));

                Core.log(`图片生成成功：${outpath}`, "#0f0");
                // png图片的 dataURL，前面的数据为 64 "data:image/png;base64,".length = 22;
                dataUrl = canvas.toDataURL("image/png").slice(22);

                outpath = path.join(this._outDir, `${key}.png`);
                Core.log(`图片生成成功：${outpath}`, "#0f0");
                let fw = fs.createWriteStream(outpath);
                let data = new Buffer(dataUrl, "base64");
                let end = () => {
                    this._current = undefined;
                    console.timeEnd(key);
                    resolve();
                };
                if (Core.usePngquant) {
                    let quanter = new PngQuant(Core.pngquantArgs);
                    quanter.pipe(fw);
                    quanter.write(data);
                    quanter.on("end", end);
                } else {
                    fw.write(data, () => {
                        fw.close();
                        end()
                    });
                }
            }).catch(reason => { reject(reason) });
        });
    }

    packing(blocks: IBlock[]) {
        Core.progress.addTask();
        console.time("packing");
        let packing = new Core.blockType();
        for (let i = 0; i < blocks.length; i++) {
            blocks[i] = blocks[i] || new EmptyBlock();
        }
        let re = packing.fit(blocks);
        console.timeEnd("packing");
        console.log(re);
        Core.progress.endTask();
        return re;
    }
}

class EmptyBlock implements IBlock {
    get w() {
        return 0;
    }
    get h() {
        return 0;
    }
    getArea() {
        return 0;
    }
    clone() {
        return new EmptyBlock();
    }
} 