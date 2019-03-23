module junyou.game {

	/**
	 * 帧数据
	 * @author 3tion
	 *
	 */
    export class FrameInfo implements IDrawInfo {
        /**原始动作索引 */
        public a: number = 0;
        /**原始方向索引 */
        public d: number = -1;
        /**原始帧数索引 */
        public f: number = 0;
        /**和下一帧间隔索引 */
        public t: number = 100;
        /**事件 */
        public e: string;

        public constructor() {

        }

        toData() {
            var data: any[] = [+this.a, +this.f, +this.t];
            if (this.e || this.d != -1) {//一般情况有事件的可能性多余有特定方向的，所以先e，后d
                data.push(this.e || "");
                if (this.d) {
                    data.push(+this.d);
                }
            }
            return data;
        }

        /**
         * (description)
         * 
         * @static
         * @param data 数据的顺序：["a"(纹理中动作标识), "f"(纹理中帧数标识), "t"(这一帧执行的时间), "e"(这一帧的事件，可选参数), "d"(这一帧的指定的方向，可选参数)]
         * @returns (description)
         */
        static fromData(data) {
            let f = createObjectFromArray(FrameInfo, ["a", "f", "t", "e", "d"], data);
            if (+f.e == 0) {
                f.e = null;
            }
            return f;
        }
    }

}
