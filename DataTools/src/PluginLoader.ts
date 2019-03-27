import { PluginErrorType } from "./PluginErrorType";
import asyncFileLoad from "./asyncFileLoad";
import $vm = require("vm");
export default class PluginLoader {
    private plugin: IPlugin;
    private callback: { (data: IPluginLoaderCallback) };
    public constructor(pluginPath: string, m: IPluginData, callback: { (data: IPluginLoaderCallback) }) {
        this.callback = callback;
        var code = asyncFileLoad(pluginPath, (err, data) => {
            if (err) {
                this.sendError(PluginErrorType.LoadFailed, err);
                return;
            }
            var vm: typeof $vm = nodeRequire("vm");
            let str = data.toString();
            let plugin = <IPlugin>vm.createContext({ require: nodeRequire, console: console });
            try {
                vm.runInContext(str, plugin);
            } catch (err) {
                return this.sendError(PluginErrorType.InitFailed, err);
            }
            this.plugin = plugin;
            this.execute(m);
        });
    }

    private sendError(code: number, err?: Error) {
        // 插件代码有误
        this.callback({ type: "error", error: code, err: err });
    }

    private execute(m: IPluginData) {
        try {
            this.plugin.execute(m, ({ err, output, sdatas, cdatas, makeBin }) => {
                if (err) {
                    return this.sendError(PluginErrorType.ExecuteFailed, err);
                }
                return this.callback({ type: "success", output, sdatas, cdatas, makeBin });
            });
        } catch (err) {
            return this.sendError(PluginErrorType.ExecuteFailed, err);
        }

    }
}