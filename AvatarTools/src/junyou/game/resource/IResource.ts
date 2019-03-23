module junyou.game {
    /**
      * 基于时间回收的资源
      */
    export interface IResource {
        /**
         * 是否为静态不销毁资源
         */
        isStatic?: boolean;
        /**
         * 最后使用的时间戳
         */
        lastUseTime: number;
        /**
         * 资源id
         */
        resID: string;
        
        /**
         * 资源路径
         */
        url: string;
        
        /**
         * 销毁资源
         */
        dispose();
    }
}
