import { Core } from "../Core";
import "../../lib/packer.growing";
import { sort } from "./BlockSort";
import { BasePacking } from "./BasePacking";

/**
 * 用于辅助处理GrowingPacker的排序等
 * https://raw.githubusercontent.com/jakesgordon/bin-packing/master/js/packer.growing.js
 * 
 * @export
 * @class GrowingPacking
 */
export class GrowingPacking extends BasePacking {
    /**
     * 子装箱类实现
     * 
     * @type {IBlockPacker}
     */
    public blockPacker: IBlockPacker = new GrowingPacker();

    /**
     * 解析Image，获取图片数据和装箱后的图片文件
     * 
     * @param {IBlockPacker} packer 装箱器
     * @param {ImageInfo[]} blocks 带装箱的图片
     * @return 对应的数据 ImageInfo.prototype.toExport()的数据
     * @see ImageInfo.prototype.toExport
     */
    protected _fit(blocks: IBlock[], results: BlocksResult[]) {
        const packer = this.blockPacker;
        let len = blocks.length;
        // 先打乱顺序
        for (let ki = 0; ki < len; ki++) {
            let nb = this.idxHandler(ki, blocks);
            this.doPacking(nb, "areaI" + ki, packer, results);
        }

        // 使用基础排序尝试
        let baseSorts = sort.baseSorts,
            bi = 0,
            blen = baseSorts.length;
        for (; bi < blen; bi++) {
            let skey = baseSorts[bi];
            let sHandler = sort[skey];
            blocks.sort(sHandler);
            this.doPacking(blocks, skey, packer, results);
        }

        // 再来100次乱序
        if (blen > 6) { // 6的阶层为 720，最多只有720种排列，只用常规的排序即可得到较优解
            for (let t = 0; t < 1000; t++) {
                blocks.sort(sort.random);
                this.doPacking(blocks, "random" + t, packer, results);
            }
        }
    }

    /**
     * 按指定索引，重新排列顺序
     * [0,1,2,3,4,5,6,7]
     * 如果索引使用3，则输出[3,4,5,6,7,0,1,2]
     * @private
     * @param {number}      idx          指定的索引
     * @param {ImageInfo[]} blocks       图片集合
     * @returns 处理后的数组
     */
    private idxHandler(idx: number, blocks: IBlock[]) {
        let len = blocks.length;
        let nb: IBlock[] = [];
        let pi = 0;
        for (let ii = idx; ii < len; ii++) {
            nb[pi++] = blocks[ii];
        }
        for (let ni = 0; ni < idx; ni++) {
            nb[pi++] = blocks[ni];
        }
        return nb;
    }
}





interface GrowingPacker extends IBlockPacker { }

interface GrowingPackerConstructor {
    new (): GrowingPacker;
}

/**
 * https://raw.githubusercontent.com/jakesgordon/bin-packing/master/js/packer.growing.js
 * 装箱算法
 */
declare var GrowingPacker: GrowingPackerConstructor;