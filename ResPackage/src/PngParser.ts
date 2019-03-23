import { Core } from "./Core";
import _electron = require("electron");
import _fs = require("fs");

/**
 * 用于处理图片
 * 
 * @export
 * @class PngParser
 * @implements {IBlock}
 */
export class PngParser implements IBlock {

    image = <ImageInfo>{};

    _w: number;

    _h: number;

    /**
     * 裁剪后数据的宽度
     * 
     * @readonly
     */
    get w() {
        return this._w || this.image.width || 0;
    }

    set w(value: number) {
        this._w = value;
    }

    /**
     * 裁剪后数据的高度
     * 
     * @readonly
     */
    get h() {
        return this._h || this.image.height || 0;
    }

    set h(value: number) {
        this._h = value;
    }

    /**
     * 装箱后，在大的纹理上的起点坐标
     * 
     * @type {Point}
     */
    fit?: Point;


    getArea() {
        return this.w * this.h;
    }

    clone() {
        let b = new PngParser();
        b.image = this.image;
        b.fit = this.fit;
        return b;
    }

    getImageData() {
        let { image } = this;
        if (!image.width || !image.height) {
            return 0;
        }
        return [image.x, image.y, image.tx, image.ty, image.width, image.height];
    }

    checkFile(controls: PromiseControl) {
        return new Promise((resolve, reject) => {
            const electron: typeof _electron = nodeRequire("electron");
            const fs: typeof _fs = nodeRequire("fs");
            const img = this.image;
            fs.readFile(img.path, (err, data) => {
                if (controls.stop) {
                    return reject(PromiseControlState.ExternalStop);
                }
                console.time(img.name);
                let image = electron.nativeImage.createFromBuffer(data);
                let size = image.getSize();

                //检查图片缩放
                let scale = Core.imageScale;
                if (scale != 1) {
                    let width = size.width * scale >> 0;
                    if (width > 0) {
                        image = image.resize({ width });
                        size = image.getSize();
                    }
                }

                let { width, height } = size;
                let buffer = image.getBitmap();
                let left = width, right = 0, top = height, bottom = 0, idx = 0;
                let alpha = Core.alpha;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        idx += 3;
                        let a = buffer[idx++];
                        if (a >= alpha) {
                            if (left > x) {
                                left = x;
                            }
                            if (right < x) {
                                right = x;
                            }
                            if (top > y) {
                                top = y;
                            }
                            if (bottom < y) {
                                bottom = y;
                            }
                        }
                    }
                }
                let w = right - left;
                if (w < 0) w = 0;
                let h = bottom - top;
                if (h < 0) h = 0;
                img.width = w;
                img.height = h;
                let nB = new Buffer(w * h * 4);
                let nidx = 0;
                for (let y = 0; y < h; y++) {
                    let ty = top + y;
                    for (let x = 0; x < w; x++) {
                        let tx = left + x;
                        let idx = (ty * width + tx) * 4;
                        nB[nidx++] = buffer[idx++];
                        nB[nidx++] = buffer[idx++];
                        nB[nidx++] = buffer[idx++];
                        nB[nidx++] = buffer[idx++];
                    }
                }

                // //获取截取后的数据
                // let cimg: Electron.NativeImage = image["crop"]({ x: left, y: top, width: w, height: h });
                // img.data = cimg.toBitmap();
                img.data = nB;
                if (isNaN(img.tx)) {// 还未设置过偏移量，默认使用图片中心点作为偏移量
                    if (w > 0) {
                        let hW = width >> 1;
                        img.tx = hW - left;
                    } else {
                        img.tx = 0;
                    }
                    if (h > 0) {
                        let hH = height >> 1;
                        img.ty = hH - top;
                    } else {
                        img.ty = 0;
                    }
                }
                console.timeEnd(img.name);
                console.log(this);
                Core.progress.endTask();
                resolve();
            });
        });
    }
}
