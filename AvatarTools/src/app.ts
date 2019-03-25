
import "./Data";
import { Main } from "./Main";
const Data = jy.Data;

let _index = -1;

$("#btnEdit").linkbutton("disable");
$("#btnEdit").linkbutton({ onClick: editHandler });
$("#btnDelete").linkbutton("disable");
$("#btnDelete").linkbutton({ onClick: deleteHandler });
$("#btnSave").linkbutton("disable");
$("#btnSave").linkbutton({ onClick: Data.saveData });
$("#step1").on("dragover", e => {
    e.preventDefault();
    return false
});
$("#step1").on("drop", dropHandler);
function dropHandler(e: JQueryEventObject) {
    // 检查数据 
    e.preventDefault();
    let file = (e.originalEvent as any).dataTransfer.files[0];
    if (file.name == "pst.json") {
        let p: string = file["path"];
        const fs = nodeRequire("fs") as typeof import("fs");
        // 读取文件
        let data = fs.readFileSync(p, "utf8");
        let keys: any[] = [];
        try {
            let pstDict = JSON.parse(data);
            let pstData = Data.pstDict = {};
            for (let key in pstDict) {
                let item = pstDict[key];
                let pst = new jy.PstInfo();
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
        showSelection(keys);
    } else {
        alert("请先拖入pst.json文件");
    }
}



/**
 * 编辑选中内容
 * 
 * @private
 */
function editHandler() {
    let data = $("#pstList").datalist("getSelected");
    Data.selectData = data;
    clearStep1();
}

/**
 * 删除选中内容
 * 
 * @private
 */
function deleteHandler() {
    let data = $("#pstList").datalist("getSelected");
    if (confirm(`确认要删除${data.key}么？`)) {
        delete Data.pstDict[data.key];
        $("#pstList").datalist("deleteRow", this.index);
    }
}

function clearStep1() {
    //$("#step1").css("display", "none");
    $("#step1").remove();
    $("#step2").css("display", "block");
    egret.runEgret();
}

function showSelection(keys: any[]) {
    $("#pstList").datalist({
        data: keys,
        singleSelect: true,
        onSelect: (index) => {
            _index = index;
            $("#btnEdit").linkbutton("enable");
            $("#btnDelete").linkbutton("enable");
            $("#btnSave").linkbutton("enable");
        },
        onUnselect: () => {
            _index = -1;
            $("#btnEdit").linkbutton("disable");
            $("#btnDelete").linkbutton("disable");
            $("#btnSave").linkbutton("disable");
        }
    });
}

window["EgretEntry"] = Main;