module junyou.game {
    /**
     * 用于动画渲染的动作接口
     * 
     * @export
     * @interface IRenderActionInfo
     */
    export interface IRenderAction {
        /**
         * 动作标识
         */
        key: number;
        /**
         * 帧列表信息
         * 
         * @type {FrameInfo[]}
         */
        frames: FrameInfo[];
        /**
         * 是否为循环动作
         */
        isCircle?: boolean;
    }
}