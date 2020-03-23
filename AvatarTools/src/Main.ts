import "./Data";

const Data = jy.Data;
export class Main extends egret.DisplayObjectContainer {


    /**
     * 动作数组
     * 
     * @private
     * @type {string[]}
     */
    private actions: string[] = [];

    /**
     * 渲染器
     * 
     * @private
     * @type {jy.UnitRender}
     */
    private render: jy.UnitRender;

    lastTime: number;


    private bmp: jy.ResourceBitmap;

    private headShape: egret.Shape;

    private hurtShape: egret.Shape;

    private castDele: egret.Sprite;

    private lcx: number;
    private lcy: number;

    private playing: boolean;

    /**
     * 舞台高度的一半
     * 
     * @private
     * @type {number}
     */
    private hh: number;

    /**
     * 舞台宽度的一半
     * 
     * @private
     * @type {number}
     */
    private hw: number;

    /**
     * 当前动作
     * 
     * @private
     * @type {string}
     */
    private currentAction: string = "0";

    /**
     * 当前方向
     * 
     * @private
     * @type {number}
     */
    private currentDirection: number = 0;

    private castPoints: { [index: string]: number[][] };

    public constructor() {
        super();
        this.addEventListener(egret.Event.ADDED_TO_STAGE, this.init, this);
        $("#step2").on("dragover", e => {
            e.preventDefault();
            return false
        });
        $("#step2").on("drop", this.dropHandler);
    }

    private init() {
        let data = Data.selectData;
        let pstInfo = data.value;
        let actions = this.actions;
        this.render = new jy.UnitRender(this as any);
        let model = new jy.UModel();
        this.render.model = model;
        this.bmp = new jy.ResourceBitmap();
        model.addChild(this.bmp);
        this.addChild(model);
        this.addEventListener(egret.Event.ENTER_FRAME, this.doRender, this);
        // 绘制中心线
        let sp = new egret.Shape();
        let g = sp.graphics;
        let sw = this.stage.stageWidth;
        let sh = this.stage.stageHeight;
        let hh = sh >> 1;
        let hw = sw >> 1;
        model.x = hw;
        model.y = hh;
        this.hw = hw;
        this.hh = hh;
        g.lineStyle(1, 0xff0000);
        g.moveTo(0, hh);
        g.lineTo(sw, hh);
        g.moveTo(hw, 0);
        g.lineTo(hw, sh);
        this.addChild(sp);

        // 头顶
        sp = new egret.Shape();
        this.headShape = sp;
        g = sp.graphics;
        g.lineStyle(1, 0xff00);
        g.moveTo(0, hh);
        g.lineTo(sw, hh);
        this.addChild(sp);

        // 受创
        sp = new egret.Shape();
        this.hurtShape = sp;
        g = sp.graphics;
        g.lineStyle(1, 0xff00);
        g.moveTo(0, hh);
        g.lineTo(sw, hh);
        g.beginFill(0xff0000, 0.8);
        g.drawCircle(hw, hh, 5);
        g.endFill();
        this.addChild(sp);


        // 施法点
        let dragDele = new egret.Sprite();
        g = dragDele.graphics;
        g.lineStyle(6, 0xccccff, 0.5);
        g.beginFill(0xff);
        g.drawCircle(0, 0, 5);
        g.endFill();
        dragDele.touchEnabled = true;
        dragDele.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.castPointDrag, this);
        this.castDele = dragDele;
        dragDele.anchorOffsetX = -hw;
        dragDele.anchorOffsetY = -hh;

        actions.length = 0;
        for (let action in pstInfo.frames) {
            actions.push(action);
        }
        actions.sort((a, b) => +a - (+b));
        this.resetSelAction();
        $("#selAction").on("change", this.actionChangeHandler);
        $("#selDirection").on("change", this.directionChangeHandler);
        $("#pstKey").textbox("setText", pstInfo.key);
        $("#headY")["slider"]({
            onChange: () => {
                this.headShape.y = +$("#headY").val();
            }
        });
        $("#hurtY")["slider"]({
            onChange: () => {
                this.hurtShape.y = +$("#hurtY").val();
            }
        });

        let extra = pstInfo.extra;
        if (extra) {
            if (extra[0]) {
                $("#headY").slider("setValue", +extra[0] || 0);
            }
            if (extra[1]) {
                $("#hurtY").slider("setValue", +extra[1] || 0);
            }
            var castPoints;
            if (extra[2]) { // {[index:string]:Array<Array<number>(2)>(5)}
                castPoints = {};
                try {
                    let cData: { [index: string]: number[][] } = extra[2];
                    let tmp: number[][];
                    for (let key in cData) {
                        let pArr = cData[key];
                        if (<any>key != +key) {
                            throw new Error("Key is not number");
                        }
                        castPoints[key] = tmp = [];
                        pArr.forEach((pInfo, idx) => {
                            tmp[idx] = [+pInfo[0] || 0, +pInfo[1] || 0]
                        })
                    }
                }
                catch (e) {
                    castPoints = null;
                }
            }

            this.castPoints = castPoints;
        }
        this.refreshCastPoints();
        $("#addAction").on("click", this.addActionHandler);
        $("#btnSave").on("click", this.saveClickHandler);
        $("#btnCastPoints").on("click", this.castPointsClick);


        $("#btnPlay").on("click", this.playHandler);
        $("#btnNext").on("click", this.playNext);
        this.playing = true;
        this.checkPlay();

    }

    private checkPlay() {
        let btnPlay = $("#btnPlay");
        if (this.playing) {
            btnPlay.linkbutton({ text: "暂停" });
            $("#btnNext").linkbutton("disable");
            this.render.reset(Date.now());
        } else {
            btnPlay.linkbutton({ text: "播放" });
            $("#btnNext").linkbutton("enable");
        }
    }

    private playNext = () => {
        this.render.playNextFrame();
        $("#cFrame").text(this.render.f);
    }

    private playHandler = () => {
        this.playing = !this.playing;
        this.checkPlay();
    }

    private castPointDrag(e: egret.TouchEvent) {
        this.lcx = e.stageX;
        this.lcy = e.stageY;
        this.stage.on(EgretEvent.TOUCH_MOVE, this.tm, this);
        this.stage.on(EgretEvent.TOUCH_END, this.te, this);
    }

    private tm(e: egret.TouchEvent) {
        let castDele = this.castDele;
        let nx = e.stageX;
        let ny = e.stageY;
        let dx = nx - this.lcx;
        let dy = ny - this.lcy;
        this.lcx = nx;
        this.lcy = ny;
        let direction = jy.FACE_DIRECTION[this.currentDirection];
        let pt = this.castPoints[this.currentAction][direction];
        nx = castDele.x + dx;
        ny = castDele.y + dy;
        pt[0] = jy.FACE_SCALE_X[this.currentDirection] * nx;
        pt[1] = ny;
        castDele.x = nx;
        castDele.y = ny;
        this.refreshCastPoints();
    }

    private te() {
        this.stage.removeEventListener(egret.TouchEvent.TOUCH_MOVE, this.tm, this);
        this.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.te, this);
    }

    private castPointsClick = () => {
        let castPoints = this.castPoints;
        let flag = !!(castPoints && castPoints[this.currentAction])
        if (flag) {
            if (castPoints) {
                delete castPoints[this.currentAction];
            }
        } else {
            if (!castPoints) {
                this.castPoints = castPoints = {};
            }
            castPoints[this.currentAction] = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
        }
        this.refreshCastPoints();
    }

    private refreshCastPoints() {
        // 刷新施法点
        let castPoints = this.castPoints;
        let flag = !!(castPoints && castPoints[this.currentAction]);
        let ele = $("#castPoints");
        ele.empty();
        if (flag) {
            $("#btnCastPoints").linkbutton({ text: "删除施法点" });
            if (this.castDele.parent != this) {
                this.addChild(this.castDele);
            }
            let pts = this.castPoints[this.currentAction];
            for (var d = 0; d < 8; d++) {
                let pt = pts[jy.FACE_DIRECTION[d]];
                ele.append(`方向${d}：(x:${pt[0] * jy.FACE_SCALE_X[d]},y:${pt[1]})<br/>`)
            }
            d = this.currentDirection;
            let pt = pts[jy.FACE_DIRECTION[d]];
            this.castDele.x = pt[0] * jy.FACE_SCALE_X[d];
            this.castDele.y = pt[1];
        } else {

            jy.removeDisplay(this.castDele);

            $("#btnCastPoints").linkbutton({ text: "增加施法点" });
        }
    }

    /**
     * 添加一个动作
     * 
     * @private
     */
    private addActionHandler = () => {
        let max: number = Math.max.apply(null, this.actions as any) + 1;
        this.actions.push("" + max);
        let pstInfo = Data.selectData.value;
        let aInfo = {} as jy.ActionInfo;
        aInfo.key = max;
        aInfo.frames = [];
        pstInfo.frames[max] = aInfo;
        $("#selAction").append(`<option value="${max}">${max}</option>`);
        $("#selAction").val(max);
        this.actionChangeHandler();
    }


    /**
     * 保存数据
     * 
     * @private
     */
    private saveClickHandler = () => {
        // extra [0] 头顶坐标Y number
        // extra [1] 受创点Y number
        // extra [2] 施法点 {[index:string]:Array<Array<number>(2)>(5)}
        let pstInfo = Data.selectData.value;
        let extra: any[];
        let headY = this.headShape.y;
        let hurtY = this.hurtShape.y;
        if (headY || hurtY || this.castPoints) {
            extra = [~~headY, ~~hurtY];
            if (this.castPoints) {
                extra[2] = this.castPoints;
            }
            pstInfo.extra = extra;
        }
        let dict = Data.pstDict;
        let key = $("#pstKey").textbox("getText").trim();
        if (!key) {
            alert("请先填写PST标识");
            $("#pstKey").focus();
            return;
        }
        dict[key] = pstInfo;
        Data.saveData();
    }

    private directionChangeHandler = () => {
        var sel = $("#selDirection").find("option:selected").text();
        this.render.faceTo = +sel;
        this.currentDirection = +sel;
        this.refreshCastPoints();
    }


    private actionChangeHandler = () => {
        var sel = $("#selAction").find("option:selected").text();
        let pstInfo = Data.selectData.value;
        let aInfo = pstInfo.frames[+sel];
        this.currentAction = sel;
        $('#dg').datagrid('loadData', aInfo.frames);
        this.render.actionInfo = aInfo;
        this.resetRender();
        $("#cpAction").text(sel);
        this.refreshCastPoints();
    }

    private resetRender() {
        this.lastTime = Date.now();
        this.render.reset(this.lastTime);
        this.render.idx = 0;
        this.render.f = 0;
    }

    private resetSelAction() {
        $("#selAction").empty();
        this.actions.forEach(act => {
            $("#selAction").append(`<option value="${act}">${act}</option>`)
        });
        this.actionChangeHandler();
    }

    public dropHandler = (e: JQueryEventObject) => {
        e.preventDefault();
        let goted = this.checkFile((<DragEvent>e.originalEvent).dataTransfer.files);
        if (goted) {
            const fs = nodeRequire("fs") as typeof import("fs");
            const path = nodeRequire("path") as typeof import("path");
            const electron = nodeRequire("electron");
            const nativeImage = electron.nativeImage;
            let str = fs.readFileSync(goted.data, "utf8");
            let data = JSON.parse(str);
            let imgs: string[] = goted.img;
            let resManager = jy.ResManager;
            let key = goted.key;
            imgs.forEach(imgPath => {
                let nImg = nativeImage.createFromPath(imgPath);
                let result = path.parse(imgPath);
                let img = new Image();
                img.src = nImg.toDataURL();
                let bmd: egret.BitmapData = new egret.BitmapData(img);
                let uri = key + "/" + result.base;
                let res = new jy.SplitUnitResource(uri, jy.ConfigUtils.getResUrl(uri));
                res.bmd = bmd;
                res.state = jy.RequestState.COMPLETE;
                resManager.regResource(uri, res);
            });
            let ures = new jy.UnitResource(key, Data.selectData.value);
            ures.decodeData(data);
            this.bmp.res = ures;
            this.resetRender();
        }
    };

    onRenderFrame(now: number) {

    }

    playComplete(now: number) {

    }

    private doRender() {
        let now = Date.now();
        if (this.playing) {
            this.render.render(now);
            $("#cFrame").text(this.render.f);
        }
    }

    private checkFile(files: FileArray, parent: string = "") {

        // 必须同时找到
        let goted = null;
        let img: string[] = [];
        let data = null;
        let p: string;
        const fs = nodeRequire("fs") as typeof import("fs");
        let path = nodeRequire("path") as typeof import("path");
        // 遍历文件，检查文件是否匹配
        for (let i = 0, len = files.length; i < len; i++) {
            let file = files[i];
            if (path) { // 如果是Electron环境

                if (typeof file === "string") {
                    p = path.join(parent, <string>file);
                }
                else {
                    // 检查路径
                    p = file["path"];
                }
                p = p.replace(/\\/g, "/");
                let fstats = fs.statSync(p);
                // 如果是文件夹
                if (fstats.isDirectory()) {
                    goted = this.checkFile.call(this, fs.readdirSync(p), p);
                } else if (fstats.isFile()) {// 检查文件
                    let re = path.parse(p);
                    if (re.ext == ".png") {
                        img.push(p);
                    } else if (re.base == "d.json") {
                        data = p;
                    }
                }

            }
        }
        let re = path.parse(p);
        if (img.length && data) {
            // 得到上级目录
            let dirs = re.dir.split(path.sep);
            let key = dirs[dirs.length - 1];
            goted = { img: img, data: data, key: key };
        }
        if (goted) {
            return goted;
        }

        return null;
    }
}
interface FileArray {
    length: number;
    [index: number]: File | string;
}