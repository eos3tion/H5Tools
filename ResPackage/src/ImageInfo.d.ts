interface ImageInfo {
    /**
     * 方向
     * 
     * @type {number}
     */
    direction: number;

    /**
     * 动作
     * 
     * @type {number}
     */
    action: number;

    /**
     * 帧数
     * 
     * @type {number}
     */
    frame: number;


    /**
     * 文件名称
     * 
     * @type {string}
     * @memberOf ImageInfo
     */
    name: string;

    /**
     * 文件路径
     * 
     * @type {File}
     */
    path: string;

    /**
     * 图片的原点指  
     * 
     * 
     * 
     * 
     * 
     * 图片的原点到图片左上角的偏移量x
     * 
     * @type {number}
     */
    tx: number;
    /**
     * 图片的原点到图片左上角的偏移量y
     * 
     * @type {number}
     */
    ty: number;

    /**
     * 
     * 最终的图片数据
     * @type {typeof _electron.nativeImage}
     */
    data: Buffer;

    /**
     * 图片的原始宽度
     * 
     * @type {number}
     */
    rawWidth: number;

    /**
     * 图片的原始高度
     * 
     * @type {number}
     */
    rawHeight: number;

    width: number;

    height: number;

    /**
     * 在纹理上的偏移
     * 
     * @type {number}
     * @memberOf ImageInfo
     */
    x: number;

    /**
     * 在纹理上的偏移
     * 
     * @type {number}
     * @memberOf ImageInfo
     */
    y: number;
}

/**
 * 打包类型
 */
declare const enum PakSaveType {
    /**
     * 全部打包 (弃用)
     */
    PAK_ALL = 0,
    /**
     * 1 按方向打包 (弃用)
     */
    PAK_BY_DIRECTION = 1,
    /**
     * 2 按动作打包 (弃用)
     */
    PAK_BY_ACTION = 2,
    /**
     * 3 混合打包 (弃用)
     */
    PAK_COMPLEX = 3,
    /**
     * 单方向单动作
     */
    PAK_ONE_A_D = 4
}