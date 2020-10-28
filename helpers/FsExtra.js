var FsExtra = (function () {
    var nodeRequire = nodeRequire || require;
    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    function mkdirs(paths) {
        var len = paths.length;
        if (len == 0) {
            throw Error("路径无效" + paths);
        }
        var p = paths[0];
        if (process.platform==="win32"&&!fs.existsSync(p)) {
            throw Error("没有根目录" + p);
        }
        for (var i = 1, len = paths.length; i < len; i++) {
            p = path.join(p, paths[i]);
            if (fs.existsSync(p)) {
                var ret = fs.statSync(p);
                if (!ret.isDirectory()) {
                    throw Error("无法创建文件夹" + p);
                }
            }
            else {
                fs.mkdirSync(p);
            }
        }
    }
    function walkDirs(dir, forEach, filter = _file => true) {
        let willChecked = [dir];
        while (willChecked.length) {
            let chk = willChecked.pop();
            if (!filter(chk)) {
                continue;
            }
            let stat = fs.statSync(chk);
            if (stat.isDirectory()) {
                let files = fs.readdirSync(chk);
                files.forEach(file => {
                    willChecked.push(path.join(chk, file));
                });
            }
            else {
                forEach(chk, dir);
            }
        }
    }
    /**
     * 删除指定路径的文件
     * @param url
     */
    function remove(url) {
        //检查文件路径
        let willChecked = [url];
        let dirs = [];
        while (willChecked.length) {
            let chk = willChecked.pop();
            let stat = fs.statSync(chk);
            if (stat.isDirectory()) {
                dirs.push(chk);
                fs.readdirSync(chk).forEach(file => {
                    willChecked.push(path.join(chk, file));
                });
            }
            else {
                fs.unlinkSync(chk);
            }
        }
        while (url = dirs.pop()) {
            fs.rmdirSync(url);
        }
    }
    var xfs = {
        /**
         * 将文件夹拆分
         */
        split(filePath) {
            return path.normalize(filePath).split(path.sep);
        },
        /**
         * 同步创建文件夹
         */
        mkdirs(filePath) {
            mkdirs(xfs.split(filePath));
        },
        /**
         * 写文件
         */
        writeFileSync(filePath, data, isCorver = true, options) {
            var re = path.parse(filePath);
            mkdirs(xfs.split(re.dir));
            if (isCorver || !fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, data, options);
            }
        },
        remove,
        walkDirs
    };
    return xfs;
}());
