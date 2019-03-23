import _electron = require("electron");
import _fs = require("fs");
import _path = require("path");
import _stream = require("stream");
import _url = require("url");
import _http = require("http");
import _childProcess = require("child_process");
import { FsExtra } from "./FsExtra";
const stream: typeof _stream = nodeRequire("stream");

/**
 * 文件下载路径
 */
const downloadPath = "exe/pngquant.exe";


/**
 * pngquant的辅助类
 * 
 * 参考https://github.com/papandreou/node-pngquant 编写
 * 
 * @export
 * @class DependCheker
 */
export class PngQuant extends stream.Stream {

    /**
     * pngQuant的文件路径
     * 
     * @private
     * @type {string}
     */
    private static _binPath: string;

    /**
     * 检查pngquant.exe是否安装
     * 
     * @private
     */
    static checkBin() {
        return new Promise((resolve, reject) => {
            const electron: typeof _electron = nodeRequire("electron");
            const path: typeof _path = nodeRequire("path");
            const fs: typeof _fs = nodeRequire("fs");
            let exePath = path.join(electron.remote.app.getAppPath(), "exe")
            let pngquantBin = path.join(exePath, "pngquant.exe");
            if (fs.existsSync(pngquantBin)) {//没有找到pngquant文件
                this._binPath = pngquantBin;
                resolve();
            } else {
                //先确保文件夹创建
                FsExtra.mkdirs(exePath);
                const url: typeof _url = nodeRequire("url");
                let path = url.resolve(location.href, downloadPath);
                const http: typeof _http = nodeRequire("http");
                http.get(path, res => {
                    let ws = fs.createWriteStream(pngquantBin);
                    res.pipe(ws);
                    ws.once("close", () => {
                        this._binPath = pngquantBin;
                        resolve()
                    });
                }).once("error", (e) => {
                    reject(e);
                })
            }
        });
    }

    hasEnded: boolean;
    writable: boolean;

    readable: boolean;
    seenDataOnStdout: boolean;
    private pauseStdoutOfPngQuantProcessAfterStartingIt: boolean;

    private bufferedChunks: Buffer[];

    private pngQuantArgs: any[];

    private pngQuantProcess: _childProcess.ChildProcess;

    commandLine: string;

    constructor(pngQuantArgs: any[]) {
        super();
        this.pngQuantArgs = pngQuantArgs && pngQuantArgs.length ? pngQuantArgs : [256];
        this.writable = this.readable = true;

        this.hasEnded = false;
        this.seenDataOnStdout = false;
    }

    async write(chunk: Buffer) {
        if (this.hasEnded) {
            return;
        }
        if (!this.pngQuantProcess && !this.bufferedChunks) {
            if (this.hasEnded) {
                return;
            }

            await PngQuant.checkBin();
            const binPath = PngQuant._binPath;

            this.bufferedChunks = [];

            this.commandLine = binPath + (this.pngQuantArgs ? ' ' + this.pngQuantArgs.join(' ') : ''); // For debugging

            const childProcess: typeof _childProcess = nodeRequire("child_process");
            this.pngQuantProcess = childProcess.spawn(binPath, this.pngQuantArgs);
            this.pngQuantProcess.once('error', this._error);
            this.pngQuantProcess.stdin.once('error', this._error);
            this.pngQuantProcess.stdout.once('error', this._error);

            this.pngQuantProcess.stderr.on('data', (data: Buffer) => {
                if (!this.hasEnded) {
                    this._error(new Error(`Saw pngquant output on stderr: ${data.toString('ascii')}，command: ${this.commandLine}`));
                    this.hasEnded = true;
                }
            });

            this.pngQuantProcess.once('exit', (exitCode) => {
                if (this.hasEnded) {
                    return;
                }
                if (exitCode > 0 && !this.hasEnded) {
                    this._error(new Error(`The pngquant process exited with a non-zero exit code: ${exitCode}，command: ${this.commandLine}`));
                    this.hasEnded = true;
                }
            });

            this.pngQuantProcess.stdout.on('data', (chunk) => {
                this.seenDataOnStdout = true;
                this.emit('data', chunk);
            }).once('end', () => {
                this.pngQuantProcess = null;
                if (!this.hasEnded) {
                    if (this.seenDataOnStdout) {
                        this.emit('end');
                    } else {
                        this._error(new Error(`PngQuant: The stdout stream ended without emitting any data，command: ${this.commandLine}`));
                    }
                    this.hasEnded = true;
                }
            });

            if (this.pauseStdoutOfPngQuantProcessAfterStartingIt) {
                this.pngQuantProcess.stdout.pause();
            }
            this.bufferedChunks.forEach(function (bufferedChunk) {
                if (bufferedChunk === null) {
                    this.pngQuantProcess.stdin.end();
                } else {
                    this.pngQuantProcess.stdin.write(bufferedChunk);
                }
            }, this);
            this.bufferedChunks = null;

        }
        if (this.bufferedChunks) {
            this.bufferedChunks.push(chunk);
        } else {
            this.pngQuantProcess.stdin.write(chunk);
        }
    }

    private _error = (err: Error) => {
        if (!this.hasEnded) {
            this.hasEnded = true;
            this.cleanUp();
            this.emit('error', err);
        }
    }

    cleanUp() {
        if (this.pngQuantProcess) {
            this.pngQuantProcess.kill();
            this.pngQuantProcess = null;
        }
        this.bufferedChunks = null;
    }

    destroy() {
        if (!this.hasEnded) {
            this.hasEnded = true;
            this.cleanUp();
        }
    }

    end(chunk: Buffer) {
        if (this.hasEnded) {
            return;
        }
        if (chunk) {
            this.write(chunk);
        } else if (!this.pngQuantProcess) {
            // No chunks have been rewritten. Write an empty one to make sure there's pngquant process.
            this.write(new Buffer(0));
        }
        if (this.bufferedChunks) {
            this.bufferedChunks.push(null);
        } else {
            this.pngQuantProcess.stdin.end();
        }
    }

    pause() {
        if (this.pngQuantProcess) {
            this.pngQuantProcess.stdout.pause();
        } else {
            this.pauseStdoutOfPngQuantProcessAfterStartingIt = true;
        }
    }

    resume() {
        if (this.pngQuantProcess) {
            this.pngQuantProcess.stdout.resume();
        } else {
            this.pauseStdoutOfPngQuantProcessAfterStartingIt = false;
        }
    }
}