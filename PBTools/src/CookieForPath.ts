
const $g = (id) => { return <HTMLInputElement>document.getElementById(id) };
const fs = nodeRequire("fs");

export default class CookieForPath {
    private _key: string;
    constructor(key: string) {
        this._key = key;
    }
    public getPathCookie(id: string) {
        let sPath = cookie.getCookie(this._key + id);
        if (sPath) {
            $g(id).value = sPath;
        }
    }

    public setPathCookie(id: string, checkExists = true, checkDirectory = true): string {
        let v: string = $g(id).value;
        v = v.trim();
        $g(id).value = v;
        let flag = false;
        if (v) {
            if (checkExists) {
                if (fs.existsSync(v)) {
                    let re = fs.statSync(v);
                    if (checkDirectory) {
                        if (re.isDirectory()) {
                            flag = true;
                        }
                    }
                    else {
                        flag = true;
                    }
                }
            } else {
                flag = true;
            }
            if (flag) {
                cookie.setCookie(this._key + id, v);
                return v;
            }
        }
        return undefined;
    }
}