const enum Time {
	/**
	 * 一秒
	 */
    ONE_SECOND = 1000,
	/**
	 * 五秒
	 */
    FIVE_SECOND = 5000,
	/**
	 * 一分种
	 */
    ONE_MINUTE = 60000,
	/**
	 * 五分种
	 */
    FIVE_MINUTE = 300000,
	/**
	 * 半小时
	 */
    HALF_HOUR = 1800000,
	/**
	 * 一小时
	 */
    ONE_HOUR = 3600000,
	/**
	 * 一天
	 */
    ONE_DAY = 86400000
}
/**
 * 创建器
 */
export type Creator<T> = { new(): T } | { (): T };
/**
 * 
 * 调整ClassFactory
 * @export
 * @class ClassFactory
 * @template T
 */
export class ClassFactory<T>{

    private _creator: Creator<T>;

    private _props: Partial<T>;

    /**
     * @param {Creator<T>} creator 
     * @param {Partial<T>} [props] 属性模板
     * @memberof ClassFactory
     */
    public constructor(creator: Creator<T>, props?: Partial<T>) {
        this._creator = creator;
        this._props = props;
    }

    /**
     * 获取实例
     * 
     * @returns 
     */
    public get() {
        let ins = new (this._creator as any)();
        let p = this._props;
        for (let key in p) {
            ins[key] = p[key];
        }
        return ins;
    }
}


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

    /**
     * 回收对象的唯一自增标识  
     * 从回收池取出后，会变化  
     * 此属性只有在`DEBUG`时有效
     */
    _insid?: number;
}

/**
 * 回收池
 * @author 3tion
 *
 */
export class RecyclablePool<T> {

    private _pool: T[];
    private _max: number;
    private _creator: Creator<T>;

    public get(): T {
        var ins: T & IRecyclable;
        var pool = this._pool;
        if (pool.length) {
            ins = pool.pop();
        } else {
            ins = new (this._creator as any)();
        }
        if (typeof ins.onSpawn === "function") {
            ins.onSpawn();
        }
        return ins;
    }

    /**
     * 回收
     */
    public recycle(t: T) {
        let pool = this._pool;
        let idx = pool.indexOf(t);
        if (!~idx) {//不在池中才进行回收
            if (typeof (t as IRecyclable).onRecycle === "function") {
                (t as IRecyclable).onRecycle();
            }
            if (pool.length < this._max) {
                pool.push(t);
            }
        }
    }

    public constructor(TCreator: Creator<T>, max = 100) {
        this._pool = [];
        this._max = max;
        this._creator = TCreator;
    }
}
export type Recyclable<T> = T & { recycle(): void };


/**
 * 获取一个recyclable的对象
 * 
 * @export
 * @template T 
 * @param {({ new(): T & { _pool?: RecyclablePool<T> } })} clazz 
 */
export function recyclable<T>(clazz: { new(): T & { _pool?: RecyclablePool<T> } })
/**
 * 使用创建函数进行创建
 * 
 * @export
 * @template T 
 * @param {({ (): T & { _pool?: RecyclablePool<T> } })} clazz 
 * @param {true} addInstanceRecycle
 */
export function recyclable<T>(clazz: { (): T & { _pool?: RecyclablePool<T> } }, addInstanceRecycle?: boolean)
export function recyclable<T>(clazz: Creator<T> & { _pool?: RecyclablePool<T> }, addInstanceRecycle?: boolean): Recyclable<T> {
    let pool = clazz._pool;
    if (!pool) {
        if (addInstanceRecycle) {
            pool = new RecyclablePool(function () {
                let ins = new (clazz as any)();
                ins.recycle = recycle;
                return ins;
            })

        } else {
            pool = new RecyclablePool(clazz);
            let pt = clazz.prototype;
            if (pt.recycle == undefined) {
                pt.recycle = recycle;
            }
        }
        Object.defineProperty(clazz, "_pool", {
            value: pool
        })
    }
    return pool.get() as Recyclable<T>;
    function recycle() {
        pool.recycle(this);
    }
}

/**
  * GTimer
  */
interface GTimer {
    /**
     * 标识
     */
    tid: number;
    /**
     * 回调列表
     */
    list: CallbackInfo<Function>[];

    nt: number;

}
const _timeobj: { [index: number]: GTimer } = {};
let tmpList: CallbackInfo<Function>[] = [];
let willDeleted: string[] = [];
function tick(now: number) {
    let d = 0;
    for (let key in _timeobj) {
        let timer = _timeobj[key];
        if (timer.nt < now) {
            timer.nt = now + timer.tid;
            let list = timer.list;
            let len = list.length;
            if (len > 0) {
                for (let i = 0; i < len; i++) {
                    tmpList[i] = list[i];
                }
                for (let i = 0; i < len; i++) {
                    tmpList[i].execute(false);
                }
            }
            len = list.length;
            if (len == 0) {
                willDeleted[d++] = key;
            }
        }
    }
    for (let i = 0; i < d; i++) {
        delete _timeobj[willDeleted[i]];
    }
}

function getInterval(time: number) {
    return Math.ceil(time / 10) * 10;
}
/**
 * 
 * 注册回调
 * @static
 * @param {number} time 回调的间隔时间，间隔时间会处理成30的倍数，向上取整，如 设置1ms，实际间隔为30ms，32ms，实际间隔会使用60ms
 * @param {Function} callback 回调函数，没有加this指针是因为做移除回调的操作会比较繁琐，如果函数中需要使用this，请通过箭头表达式()=>{}，或者将this放arg中传入
 * @param {any} [thisObj] 回调函数的`this`对象，不传值则使用全局上下文即window
 * @param {any} args 回调函数的参数
 */
function addCallback(time: number, callback: Function, thisObj?: any, ...args) {
    time = getInterval(time);
    let timer = _timeobj[time];
    if (!timer) {
        timer = <GTimer>{};
        timer.tid = time;//setInterval(check, time, timer);
        timer.nt = Date.now() + time;
        let list: CallbackInfo<Function>[] = [];
        timer.list = list;
        _timeobj[time] = timer;
        list.push(CallbackInfo.get(callback, thisObj, ...args));
    } else {
        CallbackInfo.addToList(timer.list, callback, thisObj, ...args);
    }
}

/**
 * 移除回调
 * 
 * @static
 * @param {number} time         回调的间隔时间，间隔时间会处理成30的倍数，向上取整，如 设置1ms，实际间隔为30ms，32ms，实际间隔会使用60ms
 * @param {Function} callback   回调函数，没有加this指针是因为做移除回调的操作会比较繁琐，如果函数中需要使用this，请通过箭头表达式()=>{}，或者将this放arg中传入
 * @param {*} [thisObj]         回调函数的`this`对象
 */
function removeCallback(time: number, callback: Function, thisObj?: any) {
    time = getInterval(time);
    let timer = _timeobj[time];
    if (timer) {
        let list = timer.list;
        let j = -1;
        for (let i = 0, len = list.length; i < len; i++) {
            let info = list[i];
            if (info.checkHandle(callback, thisObj)) {
                j = i;
                break;
            }
        }
        if (~j) {
            list.splice(j, 1);
        }
        if (!list.length) {
            clearInterval(timer.tid);
            delete _timeobj[time];
        }
    }
}

export const TimerUtil = { addCallback, removeCallback, tick };


function call(info: $CallbackInfo, ars?: ArrayLike<any>) {
    let args = [];
    let i = 0;
    if (ars) {
        for (; i < ars.length; i++) {
            args[i] = ars[i];
        }
    }
    let argus = info.args;
    if (argus) {
        for (let j = 0; j < argus.length; j++) {
            args[i++] = argus[j];
        }
    }
    let callback = info.callback;
    let result;
    if (callback != undefined) {
        result = callback.apply(info.thisObj, args);
    }
    return result;
}

export type $CallbackInfo = CallbackInfo<Function>;

/**
 * 回调信息，用于存储回调数据
 * @author 3tion
 *
 */
export class CallbackInfo<T extends Function> {
    public callback: T;
    public args: any[];
    public thisObj: any;
    /**
     * 待执行的时间
     */
    public time: number;
    constructor() {

    }

    public init(callback: T, thisObj?: any, args?: any[]) {
        this.callback = callback;
        this.args = args;
        this.thisObj = thisObj;
    }

    /**
     * 检查回调是否一致，只检查参数和this对象,不检查参数
     */
    public checkHandle(callback: T, thisObj: any) {
        return this.callback === callback && this.thisObj == thisObj/* 允许null==undefined */;
    }

    /**
     * 执行回调
     * 回调函数，将以args作为参数，callback作为函数执行
     * @param {boolean} [doRecycle=true] 是否回收CallbackInfo，默认为true
     */
    public execute(doRecycle = true) {
        let callback = this.callback;
        let result = call(this);
        if (doRecycle) {
            this.recycle();
        }
        return result;
    }

    /**
     * 用于执行其他参数
     * 初始的参数会按顺序放在末位
     * @param args (description)
     */
    public call(...args)
    public call() {
        return call(this, arguments);
    }

    /**
     * 用于执行其他参数
     * 初始的参数会按顺序放在末位
     * 此方法会回收callbackInfo
     * @param {any} args 
     */
    public callAndRecycle(...args)
    public callAndRecycle() {
        let result = call(this, arguments);
        this.recycle();
        return result;
    }

    public onRecycle() {
        this.callback = undefined;
        this.args = undefined;
        this.thisObj = undefined;
    }


    public recycle: { () };

    /**
     * 获取CallbackInfo的实例
     */
    public static get<T extends Function>(callback: T, thisObj?: any, ...args: any[]): CallbackInfo<T> {
        var info = recyclable(CallbackInfo);
        info.init(callback, thisObj, args);
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
    public static addToList<T extends Function>(list: CallbackInfo<T>[], handle: T, thisObj?: any, ...args: any[]) {
        //检查是否有this和handle相同的callback
        for (var callback of list) {
            if (callback.checkHandle(handle, thisObj)) {
                callback.args = args;
                return callback;
            }
        }
        callback = this.get(handle, thisObj, ...args);
        list.push(callback);
        return callback;
    }
}


export interface RPCCallback {
    /**
     * 成功的回调函数
     * 
     * @type {Recyclable<CallbackInfo<(data?: any, ...args)>>}
     * @memberof RPCCallback
     */
    success: Recyclable<CallbackInfo<{ (data?: any, ...args) }>>;

    /**
     * 失败的回调函数
     * 
     * @type {Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>}
     * @memberof RPCCallback
     */
    error: Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>;
    /**
     * RPC的超时时间
     * 
     * @type {number}
     * @memberof RPCCallback
     */
    expired: number;

    id: number;
}

export const enum RPCConst {
    /**
     * 默认超时时间
     */
    DefaultTimeout = 2000,
}

export interface RPCInterface {
    /**
     * 超时的错误常量 `RPCTimeout`
     * 
     * @type {string}
     * @memberof RPCInterface
     */
    readonly Timeout: string;
    /**
     * 执行回调
     * 
     * @param {number} id 执行回调的id
     * @param {*} [data] 成功返回的数据
     * @param {(Error | string)} [err] 错误
     */
    callback(id: number, data?: any, err?: Error | string);
    /**
     * 注册回调函数
     * 
     * @param {Recyclable<CallbackInfo<{ (data?: any, ...args) }>>} success     成功的函数回调
     * @param {Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>} [error]    发生错误的函数回调
     * @param {number} [timeout=2000] 超时时间，默认2000，实际超时时间会大于此时间，超时后，如果有错误回调，会执行错误回调，`Error(RPC.Timeout)`
     * @returns 回调函数的id
     */
    registerCallback(success: Recyclable<CallbackInfo<{ (data?: any, ...args) }>>, error?: Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>, timeout?: number): number

    /**
     * 注册回调函数
     * 成功则data为返回的数据  
     * 失败时  
     * `withError`为`true` data为Error   
     * `withError`不填或者`false` data为undefined
     * @param {{ (data?: any, ...args) }} callback 回调函数，成功或者失败均会使用此回调
     * @param {boolean} [withError] 返回回调失败时，是否使用Error，默认失败，data为`undefined`
     * @param {number} [timeout=2000] 回调函数的超时时间，默认为2000
     * @param {*} [thisObj] 
     * @param {any} any 
     * @returns {number} 
     * @memberof RPCInterface
     */
    registerCallbackFunc(callback: { (data?: any, ...args) }, withError?: boolean, timeout?: number, thisObj?: any, ...any): number
    /**
     * 根据id移除回调函数
     * 
     * @param {number} id 
     */
    removeCallback(id: number)
}
let seed = 1;
let callbacks = {} as { [index: number]: RPCCallback };
const Timeout = "RPCTimeout";
let count = 0;
let start: boolean;
let willDel = [];
export const RPC: RPCInterface = {
    Timeout,
    callback,

    registerCallback,
    /**
     * 注册回调函数，成功和失败，均使用该方法  
     * 成功则data为返回的数据  
     * 失败则data为Error  
     * @param {{ (data?: any, ...args) }} callback 
     * @param {*} [thisObj] 
     * @param {any} any 
     */
    registerCallbackFunc(callback: { (data?: any, ...args) }, withError?: boolean, timeout: number = RPCConst.DefaultTimeout, thisObj?: any, ...args) {
        let success = CallbackInfo.get(callback, thisObj, ...args);
        let error = CallbackInfo.get(withError ? callback : noErrorCallback(callback, thisObj), thisObj, ...args);
        return registerCallback(success, error, timeout);
    },
    /**
    * 根据id移除回调函数
    * 
    * @param {number} id 
    */
    removeCallback(id: number) {
        let callback = callbacks[id];
        deleteCallback(id);
        if (callback) {
            let { success, error } = callback;
            if (success) {
                success.recycle();
            }
            if (error) {
                error.recycle();
            }
        }
    }
}
function noErrorCallback(callback: Function, thisObj?: any) {
    return (err?: Error, ...args) => {
        callback.call(thisObj, undefined, ...args);
    }
}
/**
 * 注册回调函数
 * 
 * @param {Recyclable<CallbackInfo<{ (data?: any, ...args) }>>} success     成功的函数回调
 * @param {Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>} [error]    发生错误的函数回调
 * @param {number} [timeout=2000] 超时时间，默认2000，实际超时时间会大于此时间，超时后，如果有错误回调，会执行错误回调，`Error(RPC.Timeout)`
 * @returns 
 */
function registerCallback(success: Recyclable<CallbackInfo<{ (data?: any, ...args) }>>, error?: Recyclable<CallbackInfo<{ (error?: Error, ...args) }>>, timeout: number = RPCConst.DefaultTimeout) {
    let id = seed++;
    callbacks[id] = { id, expired: Date.now() + timeout, success, error };
    count++;
    if (!start) {
        TimerUtil.addCallback(Time.ONE_SECOND, check);
        start = true;
    }
    return id;
}
function deleteCallback(id: number) {
    if (id in callbacks) {
        delete callbacks[id];
        count--;
        if (count == 0) {
            TimerUtil.removeCallback(Time.ONE_SECOND, check);
            start = false;
        }
    }
}
/**
   * 执行回调
   * 
   * @param {number} id 执行回调的id
   * @param {*} [data] 成功返回的数据
   * @param {(Error | string)} [err] 错误
   */
function callback(id: number, data?: any, err?: Error | string) {
    let callback = callbacks[id];
    if (!callback) {
        return
    }
    deleteCallback(id);
    let { success, error } = callback;
    let result;
    if (err) {
        if (typeof err === "string") {
            err = new Error(err);
        }
        if (error) {
            result = error.call(err);
            error.recycle();
        }
        if (success) {
            success.recycle();
        }
    } else {
        if (error) {
            error.recycle();
        }
        if (success) {
            result = success.call(data);
            success.recycle();
        }
    }
    return result;
}
function check() {
    let del = willDel;
    let i = 0;
    let now = Date.now();
    for (let id in callbacks) {
        let callback = callbacks[id];
        if (now > callback.expired) {
            del[i++] = id;
        }
    }
    for (let j = 0; j < i; j++) {
        let id = del[j];
        callback(id, null, Timeout);
    }
}
