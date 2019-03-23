module junyou.game {
    /**
   * 人物容器转向时候，对应的scaleX，或者matrix的a
   */
    export const FACE_SCALE_X: { [index: number]: number } =
        {
           /*↓*/ 0: 1,
           /*↘*/ 1: 1,
           /*→*/ 2: 1,
           /*↗*/ 3: 1,
           /*↑*/ 4: 1,
           /*↖*/ 5: -1,
           /*←*/ 6: -1,
           /*↙*/ 7: -1
        }

    /**
     * 朝向对应的帧序列
     */
    export const FACE_DIRECTION: number[] = [
			/*0*/0,
			/*1*/1,
			/*2*/2,
			/*3*/3,
			/*4*/4,
			/*5*/3,
			/*6*/2,
			/*7*/1];

	/**
	 * 模型(纸娃娃)渲染器
	 */
    export class UnitRender extends BaseRender {

        public faceTo: number = 0;

        public actionInfo: IRenderAction;

        public model: egret.DisplayObjectContainer;

        protected nextRenderTime: number = 0;

        protected renderedTime: number = 0;
        constructor() {
            super();
            // this.unit = unit;
            this.resetTime(Global.now);
        }

        public resetTime(now: number) {
            this.renderedTime = now;
            this.nextRenderTime = now;
        }

        public playNextFrame() {
            let idx = ++this.idx;
            let frames: FrameInfo[] = this.actionInfo.frames;
            if (idx >= frames.length) {
                idx = 0;
            }
            this.willRenderFrame = frames[idx];
            this.idx = idx;
            this.doRender(0);
        }

        /**
         * 处理数据
         * 
         * @param {number} now 时间戳
         */
        public doData(now: number) {
            var actionInfo = this.actionInfo;
            if (actionInfo) {
                this.onData(actionInfo, now);
            }
        }

        public render(now: number) {
            var actionInfo = this.actionInfo;
            if (actionInfo) {
                this.onData(actionInfo, now);
                this.doRender(now);
            }
        }

        clearRes() {
            //清空显示
            for (let res of <ResourceBitmap[]>this.model.$children) {
                res.bitmapData = null;
            }
        }

        renderFrame(frame: FrameInfo, now: number) {
            if (frame) {
                let d = frame.d;
                if (d == -1) {
                    d = this.faceTo;
                }
                this.d = FACE_DIRECTION[d];
                this.model.scaleX = FACE_SCALE_X[d];
                this.f = frame.f;
                this.a = frame.a;
            }
            //渲染
            for (let res of <ResourceBitmap[]>this.model.$children) {
                res.draw(this, now);
            }
        }
    }

}
