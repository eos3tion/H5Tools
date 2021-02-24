/**
 * 技能范围数据
 */
export interface SkillAreaCfg {
    /**
     * 技能范围id
     */
    id: string;
    /**
     * 0 圆形
     * 1 矩形
     * 2 扇形
     */
    type: number;
    /**
     * 半径
     */
    range: number;
    /**
     * 目标数据
     */
    area: Area[];
    /**
     * 0 圆形 无
     * 1 矩形 宽
     * 2 扇形 角度
     */
    param1?: number;

    param2?: number;
}

export interface Area {
    /**
     * 范围数组
     */
    areas: Point[];
    /**
     * 主目标点
     */
    target: Point;
}

export interface Point {
    x: number;
    y: number;
}