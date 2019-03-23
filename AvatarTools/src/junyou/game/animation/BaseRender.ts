module junyou.game {
	/**
	 * 基础渲染器
	 * @author 3tion
	 *
	 */
    export class BaseRender implements IDrawInfo {

    	/**
    	 * 全局单位播放速度
    	 */
        public static globalPlaySpeed: number = 1;
        /**
         * 是否有当前帧
         */
        public willRenderFrame: FrameInfo;

        /**原始动作索引 */
        public a: number;
        /**原始方向索引 */
        public d: number = 0;
        /**原始帧数索引 */
        public f: number = 0;

        /**
         * 数组的索引
         */
        public idx: number = 0;

        /**
         * 下一次需要重新计算渲染的时间
         */
        protected nextRenderTime: number = 0;

        /**
         * 当前渲染时间
         */
        protected renderedTime: number = 0;

        /**
         * 播放速度，默认为1倍速度<br/>
         * 值越高，速度越快
         */
        protected _playSpeed: number = 1;

        /**
         * 播放速度，默认为1倍速度<br/>
         * 值越高，速度越快
         */
        public get playSpeed(): number {
            return this._playSpeed;
        }

        /**
         * 设置播放速度
         */
        public set playSpeed(value: number) {
            if (value < 0) {
                value = 0;
            }
            if (value != this._playSpeed) {
                this._playSpeed = value;
            }
        }

        /**
         *  处理数据帧
         */
        public onData(actionInfo: IRenderAction, now: number) {
            var nextRenderTime = this.nextRenderTime;
            if (nextRenderTime < now) {
                var renderedTime = this.renderedTime;
                let frames: FrameInfo[] = actionInfo.frames;
                //当前帧
                let idx = this.idx;
                //最后一帧
                let flen = frames.length - 1;
                let ps = this.playSpeed * BaseRender.globalPlaySpeed;
                let frame: FrameInfo;
                if (ps > 0) {
                    ps = 1 / ps;
                    if (ps < 0.01) {//最快处理100倍速度
                        ps = 0.01;
                    }
                    do {
                        frame = frames[idx];
                        if (frame) {
                            let tt = frame.t * ps || now - renderedTime;// 容错
                            nextRenderTime = renderedTime + tt;
                            if (nextRenderTime < now) {
                                if (frame.e) {
                                    this.dispatchEvent(frame.e, now);
                                }
                                renderedTime = nextRenderTime;
                                idx++;
                            }
                            else {
                                break;
                            }
                        } else {
                            this.idx = 0;
                            break;
                            // if (!actionInfo.isCircle) {
                            //     this.doComplete(now);
                            //     return;
                            // } else {
                            //     break;
                            // }
                        }
                    }
                    while (true)
                }
                else {// 播放速度为0则暂停
                    frame = frames[idx];
                }
                this.idx = idx;
                this.renderedTime = renderedTime;
                this.nextRenderTime = nextRenderTime;
                this.willRenderFrame = frame;
                if (idx > flen) {
                    this.idx = 0;
                    if (!actionInfo.isCircle) {
                        this.doComplete(now);
                        return;
                    }
                }
            }
        }

        /**
         * 渲染帧时调用
         * 
         * @param {number} now (description)
         */
        doRender(now: number) {
            if (this.willRenderFrame) {
                this.clearRes();
                this.renderFrame(this.willRenderFrame, now);
            }
            this.willRenderFrame = null;
        }


        /**
         * 渲染指定帧
         * @param frame
         * @param now
         */
        protected renderFrame(frame: FrameInfo, now: number) {
            this.f = frame.f;
        }


        /**
         * 清理当前帧
         */
        protected clearRes() {

        }


        /**
         * 派发事件
         * @param event     事件名
         * @param now       当前时间
         */
        protected dispatchEvent(event: string, now: number) {

        }

        /**
         * 渲染结束
         * @param now       当前时间
         */
        protected doComplete(now: number) {

        }

        public constructor() {
        }
    }
}