import $fs = require("fs");
import $http = require("http");
export default function asyncFileLoad(url: string, callback: { (err: Error, data?: Buffer) }) {
    if (/^http:\/\//.test(url)) {
        var http: typeof $http = nodeRequire("http");
        http.get(url, res => {
            let chunks: Buffer[] = [];
            res.on("data", chunk => {
                chunks.push(chunk);
            });
            res.on("end", () => {
                callback(null, Buffer.concat(chunks));
            });
        }).on("error", (e) => {
            callback(e);
        })
    } else {
        var fs: typeof $fs = nodeRequire("fs");
        fs.exists(url, exists => {
            if (exists) {
                fs.readFile(url, callback);
            } else {
                callback(Error(`无法找到指定文件${url}`));
            }
        })
    }
}