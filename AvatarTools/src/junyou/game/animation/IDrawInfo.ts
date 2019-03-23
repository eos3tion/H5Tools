module junyou.game {

    /**
     * 渲染的基础接口
     * 
     * @export
     * @interface IDrawInfo
     * @author 3tion
     */
    export interface IDrawInfo {
        /**原始动作索引 */
        a: number;
        /**原始方向索引 */
        d: number;
        /**原始帧数索引 */
        f: number;
    }
}
