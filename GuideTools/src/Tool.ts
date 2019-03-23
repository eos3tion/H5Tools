import { CallbackInfo, RPC } from "./H5Core";
import { getHttpData } from "./getHttpData";
interface ExternalToolCmd extends Array<any> {
    /**
     * 命令类型
     */
    0: number;
    /**
     * 数据
     */
    1?: any;
    /**
     * 回调id
     */
    2?: number;
}


const handlers = {} as { [cmdType: number]: { (cmd: ExternalToolCmd) } };

handlers[GuideCmdType.Callback_G] = cmd => {
    let [, data, cbid] = cmd;
    RPC.callback(cbid, data);
}
/**
 * 注册处理指令
 * 
 * @param {number} cmdType 
 * @param {{ (cmd: ExternalToolCmd) }} handler 
 */
function reg(cmdType: number, handler: { (cmd: ExternalToolCmd) }) {
    handlers[cmdType] = handler;
}
window.onmessage = e => {
    let cmd = e.data as ExternalToolCmd;
    if (cmd && Array.isArray(cmd)) {
        let handler = handlers[cmd[0]];
        if (handler) {
            handler(cmd);
        }
    }
    console.log(`接收到外部工具发出的符合规则的数据,`, cmd);
}


let toolCfg: any;
async function loadToolCfg(url: string) {
    //尝试加载工具配置
    let toolUrl = new URL("tools.json", url);
    //尝试加载配置文件
    let { content } = await getHttpData(toolUrl.href);
    toolCfg = JSON.parse(content);
    return toolCfg;
}

export function tool(gameFrame: HTMLIFrameElement) {
    return {
        reg,
        sendTo(type: number, data?, callback?: CallbackInfo<{ (data?: any) }>) {
            if (callback) {
                var cbid = RPC.registerCallback(callback)
            }
            gameFrame.contentWindow.postMessage([type, data, cbid], "*");
        },
        loadToolCfg,
        get toolCfg() {
            return toolCfg
        },
    }
}