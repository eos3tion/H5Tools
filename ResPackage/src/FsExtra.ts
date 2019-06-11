export const FsExtra = (function () {
    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    function mkdirs(paths: string[]) {
        let len = paths.length;
        if (len == 0) {
            throw Error("路径无效" + paths);
        }
        let p = paths[0];
        if (!fs.existsSync(p)) {
            throw Error("没有根目录" + p);
        }
        for (let i = 1, len = paths.length; i < len; i++) {
            p = path.join(p, paths[i]);
            if (fs.existsSync(p)) {
                let ret = fs.statSync(p);
                if (!ret.isDirectory()) {
                    throw Error("无法创建文件夹" + p);
                }
            } else {
                fs.mkdirSync(p);
            }
        }
    }
    let xfs = {
        /**
         * 将文件夹拆分
         */
        split: function (filePath: string): string[] {
            return path.normalize(filePath).split(path.sep);
        },
        /**
         * 同步创建文件夹
         */
        mkdirs: function (filePath: string) {
            mkdirs(xfs.split(filePath));
        },
        /**
         * 写文件
         */
        writeFileSync: function (filePath: string, data: string | Buffer, isCorver: boolean = true, options?: Object | string) {
            var re = path.parse(filePath);
            mkdirs(xfs.split(re.dir));
            if (isCorver || !fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, data, options);
            }
        }
    }
    return xfs;
}());
