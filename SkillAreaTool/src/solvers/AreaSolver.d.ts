interface AreaSolver {
    /**
     * 范围类型
     */
    readonly type: SkillAreaType;


    /**
     * 范围名称
     */
    readonly name: string;

    /**
     * 获取此类型的视图
     */
    getEditView(): HTMLElement;

    /**
     * 设置初始数据
     * @param data 
     */
    setParam(data: SkillParam);

    /**
     * 获取目标/范围的数据列表
     */
    getTargets(): PosArea[];

    /**
     * 根据主目标获取绘制路径
     * @param x 
     * @param y 
     */
    getGraphPath(target: Point): Path2D;
}
