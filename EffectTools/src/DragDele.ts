
/**
 * 拖拽代理
 * @author 3tion
 *
 */
export class DragDele extends egret.Sprite {

    private ox: number;
    private oy: number;

    private lx: number;
    private ly: number;

    private _offsetChange = this.offsetChange.bind(this);
    private touching: boolean;

    public aniInfo: jy.AniInfo;

    public constructor() {
        super();
        let g = this.graphics;
        g.beginFill(0, 0);
        g.drawRect(-1000, -1000, 2000, 2000);
        g.endFill();
        this.touchEnabled = true;
        this.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.tb, this);
        $(document).ready(() => {
            $("#ox")["numberspinner"]({ onChange: this._offsetChange });
            $("#oy")["numberspinner"]({ onChange: this._offsetChange });
            $("#btnCancelOffset").on("click", this.cancelHandler.bind(this));
            $("#btnSaveOffset").on("click", this.saveHandler.bind(this));
        });
    }

    private saveHandler() {
        let dx = this.ox - this.x;
        let dy = this.oy - this.y;
        let aniInfo = this.aniInfo;
        let res = aniInfo.getResource();
        //@ts-ignore
        let datas = res._datas;
        for (let key in datas) {
            let texes = datas[key];
            for (let texarr of texes) {
                for (let tex of texarr) {
                    if (tex) {
                        tex.tx += dx;
                        tex.ty += dy;
                    }
                }

            }
        }
        // 处理原始数据
        let rawData = aniInfo.rawData[1];
        for (let action in rawData) {
            let actData = rawData[action];
            for (let d = 0, len = actData.length; d < len; d++) {
                let dirData: any[] = actData[d];
                for (let f = 0, flen = dirData.length; f < flen; f++) {
                    let fdata = dirData[f];
                    if (fdata) {//为0时，是占位用的空帧
                        fdata[2] += dx;
                        fdata[3] += dy;
                    }
                }
            }
        }
        this.cancelHandler();
    }

    private cancelHandler() {
        this.x = this.ox;
        this.y = this.oy;
        $("#ox")["numberspinner"]("setValue", 0);
        $("#oy")["numberspinner"]("setValue", 0);
    }

    private offsetChange() {
        if (!this.touching) {
            var ox = +$("#ox").val();
            var oy = +$("#oy").val();
            this.x = this.ox + ox;
            this.y = this.oy + oy;
        }
    }

    private tb(e: egret.TouchEvent) {
        this.lx = e.stageX;
        this.ly = e.stageY;
        this.stage.addEventListener(egret.TouchEvent.TOUCH_MOVE, this.tm, this);
        this.stage.addEventListener(egret.TouchEvent.TOUCH_END, this.te, this);
        this.touching = true;
    }

    private tm(e: egret.TouchEvent) {
        let nx = e.stageX;
        let ny = e.stageY;
        let dx = nx - this.lx;
        let dy = ny - this.ly;
        if (dx * dx + dy * dy > 10) {
            this.lx = nx;
            this.ly = ny;
            this.x += dx;
            this.y += dy;
        }
    }

    private te(e: egret.TouchEvent) {
        this.stage.removeEventListener(egret.TouchEvent.TOUCH_MOVE, this.tm, this);
        this.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.te, this);
        $("#ox")["numberspinner"]("setValue", this.x - this.ox);
        $("#oy")["numberspinner"]("setValue", this.y - this.oy);
        this.touching = false;
    }


    public setStartPoint(sx: number, sy: number) {
        this.ox = sx;
        this.oy = sy;
        this.x = sx;
        this.y = sy;
    }
}