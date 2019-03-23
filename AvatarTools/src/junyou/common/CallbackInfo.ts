module junyou {
	/**
	 * 回调信息，用于存储回调数据
	 * @author 3tion
	 *
	 */
    export class CallbackInfo implements IRecyclable {
        public callback: Function;
        public args: any[];
        public thisObj: any;

        constructor() {

        }

        public init(callback: Function, args: any[], thisObj?: any) {
            this.callback = callback;
            this.args = args;
            this.thisObj = thisObj;
        }

        /**
         * 检查回调是否一致，只检查参数和this对象,不检查参数
         */
        public checkHandle(callback: Function, thisObj: any) {
            return this.callback === callback && this.thisObj === thisObj;
        }

        /**
         * 执行回调
         * 回调函数，将以args作为参数，callback作为函数执行
         * @param {boolean} [doRecycle=true] 是否回收CallbackInfo
         */
        public execute(doRecycle: boolean = true) {
            this.callback.apply(this.thisObj, this.args);
            if (doRecycle) {
                this.recycle();
            }
        }

        /**
         * 用于执行其他参数
         * 初始的参数会按顺序放在末位
         * @param args (description)
         */
        public call(...args) {
            if (this.args) {
                args = args.concat(this.args);
            }
            this.callback.apply(this.thisObj, args);
        }

        public onRecycle() {
            this.callback = null;
            this.args = null;
            this.thisObj = null;
        }

        /**
         * 回收
         */
        public recycle() {
            CallbackInfo._pool.recycle(this);
        }

        private static _pool: RecyclablePool<CallbackInfo> = new RecyclablePool(CallbackInfo);


        /**
         * 获取CallbackInfo的实例
         */
        public static getInstance(callback: Function, thisObj?: any, args: any[] = null): CallbackInfo {
            var info = this._pool.getInstance();
            info.init(callback, args, thisObj);
            return info;
        }


        /**
         * 加入到数组
         * 检查是否有this和handle相同的callback，如果有，就用新的参数替换旧参数
         * @param list
         * @param handle
         * @param args
         * @param thisObj
         */
        public static addToList(list: CallbackInfo[], handle: Function, args: any[] = null, thisObj?: any) {
            //检查是否有this和handle相同的callback
            for (var callback of list) {
                if (callback.checkHandle(handle, thisObj)) {
                    callback.args = args;
                    return;
                }
            }
            list.push(this.getInstance(handle, thisObj, args));
        }
    }
}

