import { getDataPath } from "./Helper.js";

/**
 * 检查并下载文件
 * @param localPath 
 * @param remotePath 
 */
export function checkAndDownloadFile(localPath: string, remotePath: string) {
    return new Promise<string>((resolve, reject) => {
        const path: typeof import("path") = nodeRequire("path");
        const fs: typeof import("fs") = nodeRequire("fs");
        let binPath = getDataPath(localPath);
        let baseDir = path.dirname(binPath);
        if (fs.existsSync(binPath)) {//没有找到pngquant文件
            resolve(binPath);
        } else {
            //先确保文件夹创建
            FsExtra.mkdirs(baseDir);
            const url: typeof import("url") = nodeRequire("url");
            let path = url.resolve(location.href, remotePath);
            const http: typeof import("http") = nodeRequire("http");
            http.get(path, res => {
                let ws = fs.createWriteStream(binPath);
                res.pipe(ws);
                ws.once("close", () => {
                    resolve(binPath)
                });
            }).once("error", (e) => {
                reject(e);
            })
        }
    });
}