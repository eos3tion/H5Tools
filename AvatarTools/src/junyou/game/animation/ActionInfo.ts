module junyou.game {

	/**
	 * 动作数据
     * @author 3tion
	 */
    export class ActionInfo implements IRenderAction {
        /**
         * 动作的标识
         */
        public key: number;

        /**
         * 帧信息列表
         */
        public frames: FrameInfo[];

        /**
         * 动画默认的总时间
         */
        public totalTime: number;

        /**
         * 是否为循环动作
         */
        public isCircle: boolean;

        static fromData(data, key: number) {
            var aInfo = new ActionInfo();
            aInfo.key = key;
            var d: any[] = data[0];
            var totalTime: number = 0;
            var j = 0;
            d.forEach((item) => {
                let f = FrameInfo.fromData(item);
                totalTime += f.t;
                d[j++] = f;// 防止有些错误的空数据
            });
            aInfo.frames = d;
            aInfo.totalTime = totalTime;
            aInfo.isCircle = !!data[1];
            return aInfo;
        }

        toData() {
            if (this.isCircle) {
                return [this.frames.toData(), 1];
            } else {
                return [this.frames.toData()];
            }
        }
    }
}
