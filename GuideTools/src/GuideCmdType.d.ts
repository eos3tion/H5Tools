declare const enum GuideCmdType {
    /**
     * RPC的回调完成指令
     */
    Callback_T,

    /**
     * 由游戏发来的RPC回调完成
     */
    Callback_G,
}

declare const enum GuideCmdType {

    /**
     * 收到录制一步的指令
     */
    Record_T = 100,

    /**
     * 发送一个选中的可视对象
     */
    RecordItemBitmap_G,
    /**
     * 完成当前录制
     */
    Save_T,
    /**
     * 执行引导
     */
    DoGuide_T,
}