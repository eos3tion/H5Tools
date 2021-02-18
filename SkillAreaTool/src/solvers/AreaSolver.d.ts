interface AreaSolver {
    /**
     * 检查数据
     * @param data 要检查的数据
     * @param dict 传入的字典
     */
    getIdentityData(data: SkillInput, dict: SkillIdentityDict);
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

    /**
     * 获取当前正在编辑的数据的唯一标识
     */
    getCurId(): string;
    /**
     * 根据当前控件的值，生成一个技能
     */
    getTemp(): SkillInput;
    /**
     * 用于上抛重新绘制的事件
     * @param viewChange 重新绘制的回调
     */
    bindViewChange(viewChange: { () });
    reset();
}

declare type SkillIdentityDict = { [id: string]: SkillInput }