const path: typeof import("path") = nodeRequire("path");
const fs: typeof import("fs") = nodeRequire("fs");

const FileExt = ".h";

function walkDirSync(dir: string, dict: { [key: string]: string }, excludeReg: RegExp) {
    var dirList = fs.readdirSync(dir);
    let error = "";
    dirList.forEach((item) => {
        var tpath = path.join(dir, item);
        if (!excludeReg || tpath.search(excludeReg) == -1) {
            if (fs.statSync(tpath).isDirectory()) {
                error += walkDirSync(tpath, dict, excludeReg);
            }
            else {
                let re = path.parse(item);
                if (re.ext == FileExt) {
                    item = re.name;
                    if (item in dict) {
                        error += `${item}重名\n`;
                    }
                    dict[item] = tpath;
                }
            }
        }
    });
    return error;
}

export function getClassHelper(baseDir: string, excludeReg?: RegExp) {
    const classPathDict: { [key: string]: string } = {};
    const error = walkDirSync(baseDir, classPathDict, excludeReg);
    return {
        getInclude(className: string, currentPath: string) {
            let tpath = classPathDict[className];
            if (!tpath) {
                return;
            }
            tpath = path.relative(currentPath, tpath).replace(/\\/g, "/");
            if (tpath.startsWith("/")) {
                tpath = tpath.slice(1);
            }
            return tpath;
        },
        reg(className: string, path: string) {
            classPathDict[className] = path;
        },
        getError() {
            return error;
        }
    }
}

export type ClassHelper = ReturnType<typeof getClassHelper>;