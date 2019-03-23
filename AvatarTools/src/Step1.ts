module junyou.tools {
    let path, fs;
    let require = window["nodeRequire"];
    if (typeof require === "function") { //是Electron环境
        path = require("path");
        fs = require("fs");
    }
    import path = require("path");
    import fs = require("fs");

    /**
     * 第一步加载pst数据的操作
     * @author 3tion
     */
    export class Step1 {
        private selectPst: any;
        private index = -1;
        private dropHandler = (e: JQueryEventObject) => {
            // 检查数据 
            e.preventDefault();
            let file = e.originalEvent.dataTransfer.files[0];
            if (file.name == "pst.json") {
                let p: string = file["path"];
                // 读取文件
                let data = fs.readFileSync(p, "utf8");
                let keys: any[] = [];
                try {
                    let pstDict = JSON.parse(data);
                    let pstData = Data.pstDict = {};
                    for (let key in pstDict) {
                        let item = pstDict[key];
                        let pst = new game.PstInfo();
                        pst.init(key, item);
                        pstData[key] = pst;
                        keys.push({ text: key, key: key, value: pst });
                    }
                }
                catch (e) {
                    alert("拖入数据有误，请重新拖入");
                    return;
                }
                Data.dataFile = p;
                this.showSelection(keys);
            } else {
                alert("请先拖入pst.json文件");
            }
        }
        constructor() {
            $("#btnEdit").linkbutton("disable");
            $("#btnEdit").linkbutton({ onClick: this.editHandler });
            $("#btnDelete").linkbutton("disable");
            $("#btnDelete").linkbutton({ onClick: this.deleteHandler });
            $("#btnSave").linkbutton("disable");
            $("#btnSave").linkbutton({ onClick: Data.saveData });
            $("#step1").on("dragover", e => {
                e.preventDefault();
                return false
            });
            $("#step1").on("drop", this.dropHandler);
        }

        /**
         * 编辑选中内容
         * 
         * @private
         */
        private editHandler = () => {
            let data = $("#pstList").datalist("getSelected");
            Data.selectData = data;
            this.clearStep1();
        }

        /**
         * 删除选中内容
         * 
         * @private
         */
        private deleteHandler = () => {
            let data = $("#pstList").datalist("getSelected");
            if (confirm(`确认要删除${data.key}么？`)) {
                delete Data.pstDict[data.key];
                $("#pstList").datalist("deleteRow", this.index);
            }
        }

        private clearStep1() {
            //$("#step1").css("display", "none");
            $("#step1").remove();
            $("#step2").css("display", "block");
            egret.runEgret();
        }

        private showSelection(keys: any[]) {
            $("#pstList").datalist({
                data: keys,
                singleSelect: true,
                onSelect: (index, row) => {
                    this.index = index;
                    $("#btnEdit").linkbutton("enable");
                    $("#btnDelete").linkbutton("enable");
                    $("#btnSave").linkbutton("enable");
                },
                onUnselect: () => {
                    this.index = -1;
                    $("#btnEdit").linkbutton("disable");
                    $("#btnDelete").linkbutton("disable");
                    $("#btnSave").linkbutton("disable");
                }
            });
        }
    }
}
ready(() => {
    new junyou.tools.Step1();
});