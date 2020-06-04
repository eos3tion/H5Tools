import { createRadio } from "../Core";

const enum Const {
    radioName = "radMapPath",
}

export function getDrawMapPathControl(gridLevel: number) {

    let btnEmpty: HTMLInputElement;
    let btnFull: HTMLInputElement;

    let lblPixelPoint: HTMLLabelElement;
    let lblGridPoint: HTMLLabelElement;

    const div = document.createElement("div");
    btnEmpty = document.createElement("input");
    btnEmpty.type = "button";
    btnEmpty.value = "全部可走";
    btnEmpty.addEventListener("click", fillWalkable);
    div.appendChild(btnEmpty);
    div.appendChild(document.createTextNode("  "));
    btnFull = document.createElement("input");
    btnFull.type = "button";
    btnFull.value = "全部不可走";
    btnFull.addEventListener("click", fillGrids(0));
    div.appendChild(btnFull);
    div.appendChild(document.createElement("br"));
    lblPixelPoint = document.createElement("label");
    div.appendChild(lblPixelPoint);
    div.appendChild(document.createElement("br"));
    lblGridPoint = document.createElement("label");
    div.appendChild(lblGridPoint);
    div.appendChild(document.createElement("br"));
    createRadio("不可走", 0, Const.radioName, div, false);
    createRadio("可走", 1, Const.radioName, div, true);
    for (let i = 2; i <= gridLevel; i++) {
        createRadio(`可走${i}`, i, Const.radioName, div, true);
    }

    return {

        get view() {

            return div;
        },

        onToggle(flag: boolean) {
            if (flag) {
                showMapGrid();
            } else {
                hideMapGrid();
            }
        }
    }

    function hideMapGrid() {
        onEnd();
        view.removeEventListener("mousemove", showCoord);
        $gm.$showMapGrid = false;
    }
    function showCoord(e: MouseEvent) {
        const { clientX, clientY } = e;
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
        pt = getMap().screen2Map(pt.x, pt.y);
        lblGridPoint.innerText = `格位坐标：${pt.x},${pt.y}`;
    }
}