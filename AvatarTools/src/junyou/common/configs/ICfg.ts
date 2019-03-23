module junyou{
    /**
     * 通过H5ExcelTool生成的数据
     * 
     * @export
     * @interface ICfg
     */
    export interface ICfg{
        
        /**
         * 解析配置
         * 
         * @param {*} data 单行配置的数据
         */
        decode(data:any);
    }
}