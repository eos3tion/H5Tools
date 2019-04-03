

const view = $g("StateEdit");
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
        currentShow = dele;
    }
    if (isProShow) {
        divEffectPro.hide();
    } else {
        divEffectPro.show();
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
        lblAniUri.text(data.uri);
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
    render: jy.Recyclable<jy.AniRender>;

    lx: number;
    ly: number;

    touching: boolean;

    uri: string;

    isMove: boolean;

    layer: jy.BaseLayer;

    disposed: boolean;

    showBtn: boolean;

    get text() {
        return `[${this.guid}]----${this.uri}`;
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

    public constructor(data: MapEffData) {
        super();
        let uri = data.uri;
        this.uri = uri;
        this.data = data;
        let render = jy.AniRender.getAni(uri, { start: 100 * Math.random() });
        this.render = render;
        let display = render.display;
        this.addChild(display);
        render.f = 100 * Math.random() >> 0;
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

    dispose() {
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
        jy.dispatch(AppEvent.RemoveEffect, this);
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
        }
        this.btnCopy.visible = this.btnPro.visible = this.btnDel.visible = this.showBtn = showBtn;
    }


    copy() {
        jy.dispatch(AppEvent.CopyEffect, this.data.clone());
    }

    showPro() {
        let pt = this.localToGlobal(0, 0);
        showPro(this, pt.x, pt.y);
    }

    private startMove(e: egret.TouchEvent) {
        this._mt = Date.now();
        this.lx = e.stageX;
        this.ly = e.stageY;
        this.stage.on(EgretEvent.TOUCH_MOVE, this.dragMove, this);
        this.stage.on(EgretEvent.TOUCH_END, this.dragEnd, this);
        this.touching = true;
    }

    private dragMove(e: egret.TouchEvent) {
        let nx = e.stageX;
        let ny = e.stageY;
        let dx = nx - this.lx;
        let dy = ny - this.ly;
        if (dx * dx + dy * dy > 10) {
            this.lx = nx;
            this.ly = ny;
            let dpr = window.devicePixelRatio;
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

}

jy.UnitResource.prototype.noRes = function (uri: string, r: string) {
    let tmp = new jy.SplitUnitResource(uri, this.getUrl(uri));
    tmp.bmd = this.bmd;
    tmp.qid = this.qid;
    tmp.bindTextures(this._datas, this.sInfo.adDict[r]);
    tmp.load();
    return tmp;
}