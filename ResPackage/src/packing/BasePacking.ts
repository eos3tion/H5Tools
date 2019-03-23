import { Core } from "../Core";
export abstract class BasePacking {

    /**
      * 解析Image，获取图片数据和装箱后的图片文件
      * 
      * @param {IBlockPacker} packer 装箱器
      * @param {ImageInfo[]} blocks 带装箱的图片
      * @return 对应的数据 ImageInfo.prototype.toExport()的数据
      * @see ImageInfo.prototype.toExport
      */
    public fit(blocks: IBlock[]) {
        let len = blocks.length;
        if (!len) {//增加没有导出图片的情况
            return undefined;
        }
        let results: BlocksResult[] = [];
        this._fit(blocks, results);
        let minRe: BlocksResult, min = Infinity;
        for (let i = 0; i < results.length; i++) {
            let re = results[i];
            if (re.area < min) {
                min = re.area;
                minRe = re;
            }
        }
        return minRe;
    }

    protected abstract _fit(blocks: IBlock[], results: BlocksResult[]);

    /**
     * 进行装箱
     * 
     * @param {IBlock[]} inputs 要装箱的图片数据
     * @param {string} key 排序算法的标识
     * @param {IBlockPacker} packer 装箱算法
     * @param {Result[]} results 结果集合
     */
    protected doPacking(inputs: IBlock[], key: string, packer: IBlockPacker, results: BlocksResult[]) {
        let len = inputs.length;
        let blocks = packer.fit(inputs);
        if (!blocks) {
            return;
        }
        if (len != blocks.length) {
            Core.error(`装箱时，有Block没被装箱，请检查！\t${len}\t${blocks.length}`);
            return;
        }
        let reBlocks: IBlock[] = [];
        let noFit = false;
        let width = 0;
        let height = 0;
        const sizeLimit = Core.sizeLimit;
        for (let n = 0; n < len; n++) {
            let block = blocks[n];
            let fit = block.fit;
            if (fit) {
                let right = fit.x + block.w;
                if (right > width) {
                    width = right;
                }
                let bottom = fit.y + block.h;
                if (bottom > sizeLimit) {// 由于IBlockParser有设置width的参数，所以不做宽度超标判断，只做高度超标判断，宽度超标在设置宽度时候判断
                    noFit = true;
                    break;
                }
                if (bottom > height) {
                    height = bottom;
                }
                reBlocks.push(block.clone());
            } else {
                noFit = true;
                break;
            }
        }
        if (noFit) {
            console.log(key, "noFit");
        } else {
            let result: BlocksResult = {
                key,
                blocks: reBlocks,
                width,
                height,
                area: width * height
            };
            results.push(result);
        }
    }
}