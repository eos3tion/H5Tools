import * as _cp from "child_process";
import { error, log } from "./Helper.js";
export function exec(opt: string | { cmd?: string, cwd?: string, notThrowError?: boolean }, ...args) {
    if (typeof opt === "string") {
        cmd = opt;
    } else {
        var { cmd, cwd, notThrowError } = opt;
    }
    const cp: typeof _cp = nodeRequire("child_process");
    let option: _cp.SpawnOptions = { stdio: "inherit" };
    if (cwd) {
        option.cwd = cwd;
    }
    let cmdstring = `${cmd} ${args.join(" ")}`;
    log(`开始执行：${cmdstring}`);
    let result = cp.spawnSync(cmd, args, option);
    if (result.status && !notThrowError) {
        throw Error(`status:${result.status},${result.stderr ? result.stderr.toString() : `执行失败：\t${cmdstring}`}`);
    }
    log(`执行完成：${cmdstring}`);
    if (result.stdout) {
        log(result.stdout.toString("utf8"));
    }
    return result;
}

export async function execAsync(opt: string | { cmd?: string, cwd?: string, notThrowError?: boolean, encoding?: string }, ...args) {
    if (typeof opt === "string") {
        cmd = opt;
    } else {
        var { cmd, cwd, notThrowError, encoding } = opt;
    }

    let option: _cp.SpawnOptions = { stdio: "pipe" };
    if (cwd) {
        option.cwd = cwd;
    }
    let cmdstring = `${cmd} ${args.join(" ")}`;
    log(`开始执行：${cmdstring}`);
    let td = new TextDecoder(encoding || "utf8");
    return new Promise<void>((resolve, reject) => {
        const cp: typeof _cp = nodeRequire("child_process");
        let child = cp.spawn(cmd, args, option);
        child.stderr.on("data", data => {
            error(td.decode(data as Buffer));
        })
        child.stdout.on("data", data => {
            log(td.decode(data as Buffer));
        })
        child.on("close", (code) => {
            log(`执行完成：${cmdstring}`);
            if (!notThrowError && code !== 0) {
                return reject();
            }
            resolve();
        })
    })
}

/**
 * 执行git指令
 * @param cmd 
 * @param cwd 
 * @param args 
 */
export function git(cmd: string, cwd: string, ...args) {
    return execAsync({ cmd: "git", cwd, notThrowError: true }, cmd, ...args);
}

export function checkCmdIsOK(cmd: string, args: string[], cwd?: string) {
    //检查系统是否安装了git
    const cp: typeof _cp = nodeRequire("child_process");
    let result = cp.spawnSync(cmd, args, { encoding: "utf8", cwd });
    return result.status == 0;
}