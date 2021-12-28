import { createRadio } from "../Core";
const enum Const {
    radioName = "radMapPath",
}

export interface MapInfo extends jy.Gridable, jy.MapInfo {
    gridLevel: number;

    map2Screen(x: number, y: number, isCenter?: boolean);
}

export interface MapPathControlOption {
    getMap(): MapInfo;

    setWalk(x: number, y: number, flag: any);
}


const BitMask = {
    1: 0xff,
    2: 0b01010101,
    4: 0b00010001,
    8: 0b1
}

function getCurMapWalkableMask(pdatabit: number) {
    let mask = BitMask[pdatabit];
    if (!mask) {
        mask = 0xff;
    }
    return mask;
}

export function getDrawMapPathControl(view: HTMLElement, opt: MapPathControlOption) {
    const div = document.createElement("div");
    let btnEmpty = document.createElement("input");
    btnEmpty.type = "button";
    btnEmpty.value = "全部可走";
    btnEmpty.addEventListener("click", function () {
        if (confirm(`确定全部可走？`)) {
            fillWalkable();
        }
    });
    div.appendChild(btnEmpty);
    div.appendChild(document.createTextNode("  "));
    let btnFull = document.createElement("input");
    btnFull.type = "button";
    btnFull.value = "全部不可走";
    btnFull.addEventListener("click", function () {
        if (confirm(`确定全部不可走？`)) {
            fillGrids(0);
        }
    });
    div.appendChild(btnFull);
    div.appendChild(document.createElement("br"));
    let lblPixelPoint = document.createElement("label");
    div.appendChild(lblPixelPoint);
    div.appendChild(document.createElement("br"));
    let lblGridPoint = document.createElement("label");
    div.appendChild(lblGridPoint);
    div.appendChild(document.createElement("br"));

    let checked = false;
    return {
        get view() {
            if (!checked) {
                checkComponent();
            }
            return div
        },
        onToggle
    }

    function checkComponent() {
        createRadio("不可走", 0, Const.radioName, div, false);
        createRadio("可走", 1, Const.radioName, div, true);
        const gridLevel = opt.getMap().gridLevel;
        for (let i = 2; i <= gridLevel; i++) {
            createRadio(`可走${i}`, i, Const.radioName, div, true);
        }
        checked = true;
    }

    function onToggle(flag: boolean) {
        if (flag) {
            showMapGrid();
        } else {
            hideMapGrid();
        }
    }

    function showMapGrid() {
        $gm.$showMapGrid = true;
        //监听鼠标事件
        view.addEventListener("mousedown", onBegin);
        view.addEventListener("mousemove", showCoord);
        $engine.invalidate();
    }

    function onBegin(e: MouseEvent) {
        if ((e.target as HTMLElement).tagName.toLowerCase() !== "canvas") {
            return
        }
        if (e.button == 0) {
            view.addEventListener("mousemove", onMove);
            view.addEventListener("mouseup", onEnd);
            onMove(e);
        }
    }

    function onMove(e: MouseEvent) {
        const { clientX, clientY } = e;
        //转换成格位坐标
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        pt = opt.getMap().screen2Map(pt.x, pt.y);
        //设置可走/不可走
        opt.setWalk(pt.x, pt.y, +$(`input[name=${Const.radioName}]:checked`).val());
        $engine.invalidate();
    }


    function onEnd() {
        view.removeEventListener("mousemove", onMove);
        view.removeEventListener("mouseup", onEnd);
    }

    function hideMapGrid() {
        onEnd();
        view.removeEventListener("mousedown", onBegin);
        view.removeEventListener("mousemove", showCoord);
        $gm.$showMapGrid = false;
    }


    function showCoord(e: MouseEvent) {
        const { clientX, clientY } = e;
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        lblPixelPoint.innerText = `像素坐标：${pt.x},${pt.y}`;
        pt = opt.getMap().screen2Map(pt.x, pt.y);
        lblGridPoint.innerText = `格位坐标：${pt.x},${pt.y}`;
    }

    function fillWalkable() {
        fillGrids(getCurMapWalkableMask(opt.getMap().pdatabit))
    }

    function fillGrids(val: number) {
        let pathdata = opt.getMap().pathdata;
        pathdata.fill(val);
        $engine.invalidate();
    }
}