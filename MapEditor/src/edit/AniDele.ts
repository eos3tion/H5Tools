import { DBoneMapEffRender, getDBMapEffInfo, getDBMapEffUri } from "./effs/DBoneMapEffDisplay";
import { MapEffRender } from "./effs/MapEffDisplay";

const divEffectPro = $("#divEffectPro");
const chkAniIsMovable = $g("chkAniIsMovable") as HTMLInputElement;
const sldAniScaleX = $("#sldAniScaleX");
const sldAniScaleY = $("#sldAniScaleY");
const sldAniRotation = $("#sldAniRotation");
const sldAniDuration = $("#sldAniDuration");
const sldAniSpeedX = $("#sldAniSpeedX");
const sldAniSpeedY = $("#sldAniSpeedY");
const lblAniUri = $("#lblAniUri");
const lblAniPos = $("#lblAniPos");
const txtAniSeed = $("#txtAniSeed");
const btnAniSeed = $("#btnAniSeed");

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

let shiftDown = false;
let ctrlDown = false;
function onKeyDown(e: KeyboardEvent) {
    shiftDown = e.key === "Shift";
    ctrlDown = e.key === "Control";
}
function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Shift") {
        shiftDown = false;
    }
    if (e.key === "Control") {
        ctrlDown = false;
    }
    if (e.key === "Delete") {
        if (current) {
            current.dispose();
            current = null;
        }
    }
}

function getSimpleButton(lable: string, color?: number, ox = 0, oy = 0) {
    let btn = new egret.TextField();
    btn.textAlign = egret.HorizontalAlign.CENTER;
    btn.verticalAlign = egret.VerticalAlign.MIDDLE;
    btn.fontFamily = "微软雅黑";
    btn.size = 14;
    btn.textColor = 0xffffff;
    btn.width = 50;
    btn.height = 20;
    btn.border = true;
    btn.borderColor = 0;
    btn.text = lable;
    btn.touchEnabled = true;
    if (color != undefined) {
        btn.background = true;
        btn.backgroundColor = color;
    }
    btn.x = ox;
    btn.y = oy;
    return btn;
}

let currentShow: AniDele;
let current: AniDele;
let initedEffectPro: boolean;
let isProShow: boolean;
let setView: boolean;

function isMove(data: MapEffData): data is MovableMapEffData {
    return !!data["duration"];
}

function changeProPos(x: number, y: number) {
    let dpr = window.devicePixelRatio;
    divEffectPro.css("left", x / dpr + "px");
    divEffectPro.css("top", (y / dpr + 30) + "px");
}

function showPro(dele: AniDele, x: number, y: number) {
    if (currentShow != dele) {
        isProShow = false;
        let detail = currentShow?.render?.detail;
        if (detail) {
            divEffectPro[0].removeChild(detail);
        }

        currentShow = dele;
    }
    if (isProShow) {
        divEffectPro.hide();
    } else {
        divEffectPro.show();
        let render = currentShow?.render;
        if (render) {
            let detail = render.detail;
            if (detail) {
                divEffectPro.append(detail);
                detail.show(render);
            }
        }
        setView = true;
        changeProPos(x, y);
        if (!initedEffectPro) {
            let inputs = document.querySelectorAll("#divEffectPro input");
            for (let i = 0; i < inputs.length; i++) {
                let input = inputs[i] as HTMLInputElement;
                input.addEventListener("change", onChange);
            }
            sldAniRotation.slider({ onChange });
            sldAniDuration.numberspinner({ onChange });
            sldAniSpeedX.numberspinner({ onChange });
            sldAniSpeedY.numberspinner({ onChange });
            btnAniSeed.on("click", genNewSeed);
            initedEffectPro = true;
        }
        let data = dele.data as MovableMapEffData;
        sldAniScaleX.val(data.sX || 1);
        sldAniScaleY.val(data.sY || 1);
        txtAniSeed.val(data.seed || 0);
        lblAniUri.text(dele.uri);
        (document.querySelector(`input[name=layerID][value="${data.layerID || jy.GameLayerID.CeilEffect}"]`) as HTMLInputElement).checked = true;
        dele.checkPos();
        sldAniRotation.slider("setValue", ~~data.rotation);
        chkAniIsMovable.checked = dele.isMove;

        sldAniDuration.numberspinner("setValue", ~~data.duration);
        sldAniSpeedX.numberspinner("setValue", ~~data.speedX);
        sldAniSpeedY.numberspinner("setValue", ~~data.speedY);
        setView = false;
    }
    isProShow = !isProShow;
}

function genNewSeed() {
    txtAniSeed.val(jy.Global.now);
    onChange();
}

function onChange() {
    //检查数据
    if (currentShow && !setView) {
        currentShow.isMove = chkAniIsMovable.checked;
        let data = currentShow.data as MovableMapEffData;
        data.sX = +sldAniScaleX.val() || 1;
        data.sY = +sldAniScaleY.val() || 1;
        data.rotation = ~~sldAniRotation.val();
        currentShow.checkTransform();
        data.layerID = +$("input[name=layerID]:checked").val();
        currentShow.checkLayer();
        data.duration = ~~sldAniDuration.val();
        let du = data.duration | 1;
        data.speedX = ~~sldAniSpeedX.val();
        data.speedY = ~~sldAniSpeedY.val();
        let seed = ~~txtAniSeed.val() % du;
        txtAniSeed.val(seed);
        data.seed = seed;
    }

}

let guid = 1;

/**
 * 拖拽代理
 * @author 3tion
 *
 */
export class AniDele extends egret.Sprite {
    _mt: number;
    guid: number;
    btnCopy: egret.TextField;

    btnDel: egret.TextField;
    btnPro: egret.TextField;
    btnMove: egret.TextField;
    data: MapEffData;

    lx: number;
    ly: number;

    touching: boolean;

    get uri(): string {
        return this.render?.uri || this.data.uri;
    }

    isMove: boolean;

    layer: jy.BaseLayer;

    disposed: boolean;

    showBtn: boolean;
    selected = false;
    _group: string;

    render: jy.Recyclable<MapEffRender>;

    /**
     * 分组标识
     */
    get group() {
        return this._group;
    }

    set group(value: string) {
        if (value != this._group) {
            this._group = value;
            let data = this.data;
            if (data) {
                data.group = value;
            }
        }
    }

    get text() {
        let msg = `[${this.guid}]----${this.uri}`;
        if (this._group) {
            msg += `----group:[${this._group}]`;
        }
        return msg;
    }

    get iconCls() {
        return this.visible ? "icon-blank" : "icon-clear";
    }
    onRender(now: number) {
        let display = this.render.display;
        if (this.isMove) {
            let { speedX, speedY, seed, duration } = this.data as MovableMapEffData;
            let dura = ((now - seed) % duration) / duration;
            display.x = dura * speedX;
            display.y = dura * speedY;
        } else {
            display.x = 0;
            display.y = 0;
        }
    }

    public constructor(data: MapEffData, render: jy.Recyclable<MapEffRender>) {
        super();
        this.render = render;
        this.addChild(render.display);
        this.group = data.group;
        this.data = data;
        this.isMove = isMove(data);
        this.checkTransform();
        this.checkMove();
        this.checkLayer();
        this.setStartPoint(data.x, data.y);
        this.bindComponents();
    }


    checkLayer() {
        let layerID = this.data.layerID || jy.GameLayerID.CeilEffect;
        let layer = $engine.getLayer(layerID) as jy.BaseLayer;
        this.layer = layer;
        layer.addChild(this);
    }

    checkTransform() {
        let display = this.render.display;
        let data = this.data;
        display.scaleX = data.sX || 1;
        display.scaleY = data.sY || 1;
        display.rotation = data.rotation || 0;
    }

    checkMove() {
        if (!this.isMove) {
            let data = this.data;
            this.x = data.x;
            this.y = data.y;
        }
    }

    dispose(noEmit?: boolean) {
        this.disposed = true;
        let render = this.render;
        if (render) {
            this.render = undefined;
            render.recycle();
        }
        let btn = this.btnMove;
        btn.off(EgretEvent.TOUCH_BEGIN, this.startMove, this);
        btn = this.btnPro;
        btn.off(EgretEvent.TOUCH_TAP, this.showPro, this);
        btn = this.btnDel;
        btn.off(EgretEvent.TOUCH_TAP, this.dispose, this);
        jy.removeDisplay(this);
        if (!noEmit) {
            jy.dispatch(AppEvent.RemoveEffect, this);
        }
    }
    private bindComponents() {
        let ox = 0;
        let oy = 0;
        let btn = getSimpleButton(guid + "", 0x347331, ox, oy);
        btn.on(EgretEvent.TOUCH_BEGIN, this.startMove, this);
        this.btnMove = btn;
        this.addChild(btn);
        this.guid = guid;
        guid++;
        ox += btn.width;
        btn = getSimpleButton("属性", 0x004973, ox, oy);
        btn.on(EgretEvent.TOUCH_TAP, this.showPro, this);
        this.btnPro = btn;
        this.addChild(btn);
        ox += btn.width;
        btn = getSimpleButton("复制", 0xFFC570, ox, oy);
        btn.on(EgretEvent.TOUCH_TAP, this.copy, this);
        this.btnCopy = btn;
        this.addChild(btn);
        ox += btn.width;
        btn = getSimpleButton("删除", 0x730000, ox, oy);
        btn.on(EgretEvent.TOUCH_TAP, this.dispose, this);
        this.btnDel = btn;
        this.addChild(btn);
        this.btnCopy.visible = this.btnPro.visible = this.btnDel.visible = false;
    }

    toggle() {
        const showBtn = !this.showBtn;
        if (showBtn) {
            this.checkLayer();
            current = this;
        }
        this.btnCopy.visible = this.btnPro.visible = this.btnDel.visible = this.showBtn = showBtn;
    }


    copy() {
        let data = this.data;
        let uri = this.render.uri || data.uri;
        data.uri = uri;
        jy.dispatch(AppEvent.CopyEffect, data.$clone());
    }

    showPro() {
        let pt = this.localToGlobal(0, 0);
        showPro(this, pt.x, pt.y);
    }

    private startMove(e: egret.TouchEvent) {
        if (ctrlDown) {
            this.copy();
        } else if (shiftDown) {
            let data = this.data;
            let uri = this.render.uri || data.uri;
            data.uri = uri;
            let nData = data.$clone() as MapEffData;
            let render = this.render;
            if (render instanceof DBoneMapEffRender) {
                let { folder, armature } = render;
                let armData = render.factory.getArmatureData(armature);
                let anis = armData.animationNames;
                if (anis.length > 0) {
                    let ani = anis.random();
                    uri = getDBMapEffUri(folder, armature, ani);
                }
            }
            nData.uri = uri;
            jy.dispatch(AppEvent.CopyEffect, nData);
        } else {
            this._mt = Date.now();
            this.lx = e.stageX;
            this.ly = e.stageY;
            this.stage.on(EgretEvent.TOUCH_MOVE, this.dragMove, this);
            this.stage.on(EgretEvent.TOUCH_END, this.dragEnd, this);
            this.touching = true;
            jy.dispatch(MapEvent.StartDragEff);
        }
    }

    private dragMove(e: egret.TouchEvent) {
        let nx = e.stageX;
        let ny = e.stageY;
        let dx = nx - this.lx;
        let dy = ny - this.ly;
        if (dx * dx + dy * dy > 10) {
            this.lx = nx;
            this.ly = ny;
            let dpr = window.devicePixelRatio * $engine.scale;
            this.x += dx / dpr;
            this.y += dy / dpr;
        }
        this.checkPos();
        if (isProShow && currentShow == this) {
            let pt = this.localToGlobal(0, 0);
            changeProPos(pt.x, pt.y);
        }
    }

    private dragEnd(e: egret.TouchEvent) {
        this.stage.removeEventListener(EgretEvent.TOUCH_MOVE, this.dragMove, this);
        this.stage.removeEventListener(EgretEvent.TOUCH_END, this.dragEnd, this);
        this.touching = false;
        this.checkPos();
        if (Date.now() - this._mt < 200) {
            this.toggle();
        }
        jy.dispatch(MapEvent.StopDragEff);
    }

    public setStartPoint(sx: number, sy: number) {
        this.x = sx;
        this.y = sy;
        this.checkPos();
    }

    checkPos() {
        let data = this.data;
        data.x = this.x;
        data.y = this.y;
        lblAniPos.text(`${data.x}×${data.y}`);
    }


    /**
     * 切换选中状态
     * @param flag  true 选中   false 未选中
     */
    select(flag: boolean) {
        this.selected = flag;
        let g = this.graphics;
        g.clear();
        if (flag) {
            g.lineStyle(1, 0xff0000);
            let b = this.getBounds();
            g.drawRectangle(b);
        }
    }
}

jy.UnitResource.prototype.noRes = function (this: jy.UnitResource, uri: string, r: string) {
    let tmp = new jy.SplitUnitResource(uri, this.getUrl(uri));
    tmp.bmd = this.bmd;
    tmp.qid = this.qid;
    //@ts-ignore
    let datas = this._datas;
    this.pst.bindResource(this.pst.getResKey(0, 0), tmp, datas);
    tmp.load();
    return tmp;
}