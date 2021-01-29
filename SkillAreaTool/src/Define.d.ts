/**
 * 范围类型
 */
declare const enum SkillAreaType {
    Circle = 0,
    Rectangle = 1,
    Sector = 2,
}


interface GlobalCfg {
    /**
     * 原始技能配置路径
     */
    source: string;
    /**
     * 输出的配置路径
     */
    dist: string;
    /**
     * 面积百分比，超过此面积的时候，才可放入，默认为 `0` 
     */
    percent: number;
    /**
     * 单格大小
     */
    gridSize: number;
    /**
     * 字典映射
     */
    keyDict?: {
        /**
         * 数据源标识的key
         */
        id?: string;
        /**
         * 数据源范围类型的key
         */
        type?: string;
        /**
         * 数据源攻击范围的key
         */
        range?: string;
        /**
         * 数据源参数1的key
         */
        param1?: string;
        /**
         * 数据源参数2的key
         */
        param2?: string;
        /**
         * 范围类型的映射
         * key   为数据源
         * value 为工具用的
         */
        typeDict?: { [type: string]: SkillAreaType };
    }
}

/**
 * 输入数据，经过转换后，工具内存中使用的数据源
 */
interface SkillInput extends SkillParam {
    id: string;
    type: number;
}

interface SkillParam {
    /**
     * 攻击最大距离
     */
    range: number;
    /**
     * 参数1
     */
    param1?: number;
    /**
     * 参数2
     */
    param2?: number;
}

/**
 * 技能输出用的点位数据
 */
interface SkillAreaOutput {

    id: string;
    area: PosArea[];
}

/**
 * 内存中运行时使用的数据
 */
interface SkillCfg extends SkillInput, SkillAreaOutput { }

/**
 * 技能指定落点时，对应的区域  
 */
interface PosArea {
    /**
     * 目标所在坐标的偏移量
     * 以施法者为原点(`0,0`)的坐标偏移量
     */
    target: Point;
    /**
     * 对应的攻击范围点集
     * 以施法者为原点(`0,0`)的坐标偏移量
     */
    areas: Point[];

}

interface Point {
    x: number;
    y: number;
}