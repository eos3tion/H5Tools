interface File{
    /**
     * Electron环境下文件的物理路径
     */
    path : string;
}

interface Window{
    nodeRequire:NodeRequire;
}