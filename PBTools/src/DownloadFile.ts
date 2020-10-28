import * as _electron from "electron";
import * as _path from "path";
import * as _fs from "fs";
import * as _url from "url";
import * as _http from "http";
import { getDataPath } from "./Helper";

/**
 * 检查并下载文件
 * @param localPath 
 * @param remotePath 
 */
export function checkAndDownloadFile(localPath: string, remotePath: string) {
    return new Promise<string>((resolve, reject) => {
        const path: typeof _path = nodeRequire("path");
        const fs: typeof _fs = nodeRequire("fs");
        let binPath = getDataPath(localPath);
        let baseDir = path.dirname(binPath);
        if (fs.existsSync(binPath)) {//没有找到pngquant文件
            resolve(binPath);
        } else {
            //先确保文件夹创建
            FsExtra.mkdirs(baseDir);
            const url: typeof _url = nodeRequire("url");
            let path = url.resolve(location.href, remotePath);
            const http: typeof _http = nodeRequire("http");
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