module junyou {

    /**
     * 可回收的对象
     * 
     * @export
     * @interface IRecyclable
     */
    export interface IRecyclable {
        /**
         * 回收时触发
         */
        onRecycle?: { () };
        /**
         * 启用时触发
         */
        onSpawn?: { () };
    }

	/**
	 * 回收池
	 * @author 3tion
	 *
	 */
    export class RecyclablePool<T extends IRecyclable> {

        private _pool: T[];
        private _max: number;
        private _TCreator: { new (): T };

        public getInstance(): T {
            var ins: T;
            var pool = this._pool;
            if (pool.length) {
                ins = pool.pop();
            } else {
                ins = new this._TCreator();
            }
            if (typeof ins["onSpawn"] === "function") {
                ins.onSpawn();
            }
            return ins;
        }

        /**
         * 回收
         */
        public recycle(t: T) {
            if (typeof t["onRecycle"] === "function") {
                t.onRecycle();
            }
            let pool = this._pool;
            if (pool.length < this._max) {
                if (!~pool.indexOf(t)) {
                    pool.push(t);
                }
            }
        }

        public constructor(TCreator: { new (): T }, max = 100) {
            this._pool = [];
            this._max = max;
            this._TCreator = TCreator;
        }
    }
}
