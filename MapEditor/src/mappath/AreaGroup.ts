import { createRadio } from "../Core";
import { EditMapControl } from "./PathSolution";

export interface MapInfo extends jy.MapInfo {

    /**
     * 点集
     */
    points: jy.PointGroupPB[];

    map2Screen(x: number, y: number, isCenter?: boolean);
}


export interface MapAreaGroupControlOption {
    getMap(): MapInfo;
}
export function getAreaGroupControl(view: HTMLElement, opt: MapAreaGroupControlOption): EditMapControl {
    const div = document.createElement("div");
    let btnNew = document.createElement("input");
    btnNew.type = "button";
    btnNew.value = "新建分组";
    btnNew.addEventListener("click", createNewGroup);
    div.appendChild(btnNew);
    let tree = document.createElement("div");
    div.appendChild(tree);
    let groups = new jy.ArraySet<AreaGroupItem>();
    let $tree = $(tree);
    let curSel: JQuery;
    let graphics: egret.Graphics
    $tree.accordion({
        onSelect: onPanelSelect
    })

    let isShow: boolean;

    return {
        get view() {
            return div;
        },
        onToggle,
        onSave(map: MapInfo) {
            let rawList = groups.rawList;
            let points = [];
            for (let i = 0; i < rawList.length; i++) {
                const group = rawList[i];
                let pts = group.points;
                if (pts.length) {
                    let point = {
                        id: group.id,
                        points: pts.concat()
                    }
                    points.push(point);
                }
            }
            map.points = points;
        },
        onInit(map: MapInfo) {
            let layer = $engine.getLayer(jy.GameLayerID.CeilEffect) as jy.BaseLayer;
            graphics = layer.graphics;
            let points = map.points;
            if (points) {
                for (let i = 0; i < points.length; i++) {
                    const point = points[i];
                    addGroup(point.id, point.points);
                }
            }
        }
    }

    function createNewGroup() {
        $["messager"].prompt("", "添加分组标识", groupId => {
            if (!groupId) {
                return
            }
            groupId = groupId.trim();
            let data = groups.get(groupId);
            if (!data) {
                addGroup(groupId, []);
            }
        });
    }

    function addGroup(groupId: string, points: jy.Point[]) {
        let group = { id: groupId, points: points.map(pt => getPoint(pt.x, pt.y)) } as AreaGroupItem;
        groups.set(groupId, group)
        $tree.accordion('add', {
            title: groupId,
            selected: true
        });
        let panel = $tree.accordion('getPanel', groupId);
        if (panel) {
            group.panel = panel;
            initPanel(panel, group);
        }
    }

    function onPanelSelect(groupId: string) {
        //检查当前选中
        let nSel = $tree.accordion('getPanel', groupId);
        if (curSel != nSel) {
            if (curSel) {
                clearPoints();
            }
            curSel = nSel;
            if (curSel) {
                refreshPoints();
            }
        }
    }

    function onToggle(flag: boolean) {
        isShow = flag;
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
        $engine.invalidate();
        refreshPoints();
    }

    function onBegin(e: MouseEvent) {
        if (!curSel || (e.target as HTMLElement).tagName.toLowerCase() !== "canvas") {
            return
        }

        if (e.button == 0) {
            view.addEventListener("mousemove", onMove);
            view.addEventListener("mouseup", onEnd);
            onMove(e);
        }
    }

    function onMove(e: MouseEvent) {
        let group = getGroup();
        if (!group) {
            return;
        }
        const { clientX, clientY } = e;
        //转换成格位坐标
        let dpr = window.devicePixelRatio;
        let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
        pt = opt.getMap().screen2Map(pt.x, pt.y);
        let flag = +curSel.find(`input[name=${getGroupRadioName(group.id)}]:checked`).val();
        setPoint(pt.x, pt.y, group, flag);
        $engine.invalidate();
    }

    function onEnd() {
        if (!curSel) {
            return
        }
        view.removeEventListener("mousemove", onMove);
        view.removeEventListener("mouseup", onEnd);
    }

    function setPoint(x: number, y: number, group: AreaGroupItem, flag: number) {
        //数据添加到children中
        let children = group.points
        let old = children.find(pt => pt.x == x && pt.y == y);
        if (flag) {
            if (!old) {
                children.push(getPoint(x, y))
                //在地图上显示
                refreshPoints();
            }
        } else if (old) {
            children.remove(old)
            //在地图上显示
            refreshPoints();
        }
    }

    function getPoint(x: number, y: number): Point {
        let pt = { x, y };
        Object.setPrototypeOf(pt, {
            get text() {
                return `x:${this.x},y:${this.y}`
            }
        })
        return pt;
    }

    function clearPoints() {
        graphics.clear();
    }

    function refreshPoints(refresh = true) {
        clearPoints();
        let group = getGroup();
        if (group) {
            let map = opt.getMap();
            if (map && isShow) {
                let children = group.points;
                for (let i = 0; i < children.length; i++) {
                    let pt = children[i];
                    graphics.beginFill(pt.selected ? 0xffff00 : 0xffff);
                    pt = map.map2Screen(pt.x, pt.y, true);
                    graphics.drawCircle(pt.x, pt.y, 5);
                    graphics.endFill();
                }
            }
            if (refresh) {
                group.list.datalist({ data: group.points });
            }
        }
    }

    function getGroup(panel?: JQuery) {
        panel = panel || curSel;
        if (panel) {
            let groupId = panel.panel("options").title;
            let group = groups.get(groupId);
            return group;
        }
    }

    function hideMapGrid() {
        onEnd();
        view.addEventListener("mousedown", onBegin);
        $gm.$showMapGrid = false;
        clearPoints();
    }

    function initPanel(panel: JQuery, group: AreaGroupItem) {
        let id = group.id;
        //创建控件
        let btnClear = document.createElement("input");
        btnClear.type = "button";
        btnClear.value = "全部清理";
        btnClear.setAttribute("groupId", id);
        btnClear.addEventListener("click", clearAll);
        panel.append(btnClear);

        let btnDelGroup = document.createElement("input");
        btnDelGroup.type = "button";
        btnDelGroup.value = "删除分组"
        btnDelGroup.setAttribute("groupId", id);
        btnDelGroup.addEventListener("click", delGroup);
        panel.append(btnDelGroup);


        //创建列表
        let list = document.createElement("div");
        list.style.height = "100px";
        panel.append(list);
        let $list = $(list).datalist({
            data: group.points,
            onSelect: onPointSelect,
            textField: "text"
        });


        let panelEle = panel.get(0);

        let radioName = getGroupRadioName(id);

        createRadio("删除坐标", 0, radioName, panelEle, false);
        createRadio("添加新坐标", 1, radioName, panelEle, true);

        let btnDel = document.createElement("input");
        btnDel.type = "button";
        btnDel.value = "删除";
        btnDel.setAttribute("groupId", id);
        btnDel.addEventListener("click", delPoint);
        panel.append(btnDel);

        group.list = $list;
    }

    function getGroupRadioName(id: string) {
        return `AreaGroup${id}`
    }

    function clearAll(e: MouseEvent) {
        if (confirm(`确认要清除所有点么？`)) {
            let btn = e.currentTarget as HTMLInputElement;
            let id = btn.getAttribute("groupId");
            let group = groups.get(id);
            group.points.length = 0;
            refreshPoints();
        }
    }

    function delGroup(e: MouseEvent) {
        if (confirm(`确认要删除分组么？`)) {
            let btn = e.currentTarget as HTMLInputElement;
            let id = btn.getAttribute("groupId");
            groups.delete(id);
            $tree.accordion("remove", id);
        }
    }

    function onPointSelect(idx: number, point: jy.Point) {
        let group = getGroup();
        if (group) {
            const points = group.points;
            if (points[idx] == point) {
                for (let i = 0; i < points.length; i++) {
                    const pt = points[i];
                    pt.selected = pt == point;
                }
            }
            refreshPoints(false);
        }
    }

    function delPoint() {
        let group = getGroup();
        if (group) {
            let select = group.list.datalist("getSelected");
            if (select) {
                const points = group.points;
                let j = 0;
                for (let i = 0; i < points.length; i++) {
                    const pt = points[i];
                    if (pt != select) {
                        points[j++] = pt;
                    }
                }
                points.length = j;
                refreshPoints();
            }
        }
    }
}


type Point = jy.Point & { selected?: boolean }
interface AreaGroupItem {
    id: string;
    panel?: JQuery;
    points: Point[];
    list?: JQuery;
}