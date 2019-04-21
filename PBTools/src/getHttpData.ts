import $http = require("http");
const http: typeof $http = nodeRequire("http");
const URL: typeof import("url") = nodeRequire("url");

export interface GetHttpDataCallback {
    res: $http.IncomingMessage;
    content: string;
    params: any;
    url: string;
}

/**
 * 获取http数据
 * 
 * @param {string} url 要获取数据的地址
 * @param {any} post 要提交的数据
 * @returns {Promise}
 */
function postHttpData(url: string, post?: any) {
    return new Promise<string>((resolve, reject) => {
        let opt = (<any>URL.parse(url)) as $http.RequestOptions;
        let postData = typeof post == "string" ? post : (post ? JSON.stringify(post) : "");
        opt.headers = {
            'Content-Type': 'text/json',
            'Content-Length': Buffer.byteLength(postData)
        };
        opt.method = "post";
        let req = http.request(opt, res => {
            let size = 0;
            let chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
                size += chunk.length;
                chunks.push(chunk);
            });
            res.on("end", () => {
                let data = Buffer.concat(chunks, size);
                resolve(data.toString("utf8"));
            });
        });
        req.on("error", (err) => {
            reject(err);
        });
        req.write(postData);
        req.end();
    });
}
/**
 * 获取http数据
 * 
 * @param {string} url 要获取数据的地址
 * @returns {Promise}
 */
function getHttpData(url: string, params?: any) {
    return new Promise<GetHttpDataCallback>((resolve, reject) => {
        let req = http.get(url, res => {
            let size = 0;
            let chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
                size += chunk.length;
                chunks.push(chunk);
            });
            res.on("end", () => {
                let data = Buffer.concat(chunks, size);
                resolve({ res, content: data.toString("utf8"), params, url });
            });
        });
        req.on("error", (err) => {
            reject(err.message);
        });
    });
}

export {
    getHttpData,
    postHttpData
}