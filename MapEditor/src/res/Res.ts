import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import * as $electron from "electron";
const electron: typeof $electron = nodeRequire("electron");
import * as $path from "path";
const path: typeof $path = nodeRequire("path");

import Res = jy.Res;

class BinLoader implements Res.ResLoader {
    type: XMLHttpRequestResponseType;
    constructor(type: XMLHttpRequestResponseType = "arraybuffer") {
        this.type = type;
    }
    loadFile(item: Res.ResItem, callback: jy.CallbackInfo<{ (item: Res.ResItem, ...args: any[]) }>) {
        let data, state = jy.RequestState.COMPLETE;
        switch (this.type) {
            case "json":
                data = fs.readFileSync(item.url, "utf8");
                try {
                    data = JSON.parse(data);
                } catch {
                    state = jy.RequestState.FAILED;
                }
                break;
            default:
                data = fs.readFileSync(item.url);
                break;
        }
        callback.callAndRecycle(item);

    }
}

class ImageLoader implements Res.ResLoader {
    loadFile(item: Res.ResItem, callback: jy.CallbackInfo<{ (item: Res.ResItem, ...args: any[]) }>) {
        fs.readFile(item.url, (err, data) => {
            if (err) {
                item.state = jy.RequestState.FAILED;
                return callback.callAndRecycle(item);
            }
            let ext = path.extname(item.url).toLowerCase();
            let type: string;
            switch (ext) {
                case "jpg":
                case "jpeg":
                    type = "jpeg";
                    break;
                case "png":
                    type = "png";
                    break;
            }
            let blob = new Blob([data], { type: "image/" + type });
            let url = URL.createObjectURL(blob);
            let imgD = new Image();
            imgD.onload = function () {
                let texture = new egret.Texture();
                texture.bitmapData = new egret.BitmapData(imgD);
                item.data = texture;
                item.state = jy.RequestState.COMPLETE;
                callback.callAndRecycle(item);
            }
            imgD.onerror = function () {
                item.state = jy.RequestState.FAILED;
                callback.callAndRecycle(item);
            }
            imgD.src = url;
        })
    }
}
Res.regAnalyzer(Res.ResItemType.Binary, new BinLoader());
Res.regAnalyzer(Res.ResItemType.Binary, new BinLoader());
Res.regAnalyzer(Res.ResItemType.Binary, new BinLoader());
Res.regAnalyzer(Res.ResItemType.Image, new ImageLoader());


export function addRes(uri: string, url: string) {
    jy.Res.set(uri, {
        uri,
        url
    })
}

