const _timeobj:{[index:number]:GTimer}={};

function tick(timer:GTimer) {
    timer.map.forEach((args,callback)=>{
        callback.apply(null,args);
    })
}

function getInterval(time:number) {
    return Math.ceil(time/30)*time;
}


/**
 * GTimer
 */
class GTimer {
    public tid: number;
    public map: Map<Function,any[]>;

    constructor() {
        this.map = new Map<Function,any[]>();
    }
}


module junyou{
    export class TimerUtil{
    
        /**
         * 注册回调
         * @param {number} time 回调的间隔时间，间隔时间会处理成30的倍数，向上取整，如 设置1ms，实际间隔为30ms，32ms，实际间隔会使用60ms
         */
       public static addCallback(time:number,callback:Function,...args){
            time = getInterval(time);
            var timer = _timeobj[time];
            if(!timer){
                timer=new GTimer();
                timer.tid=setInterval(tick,time,timer);
                _timeobj[time]=timer;
            }
            timer.map.set(callback,args);
        }
        
        /**
         * 移除回调
         */
        public static removeCallback(time:number,callback:Function){
            time = getInterval(time);
            var timer = _timeobj[time];
            if(timer){
                var map = timer.map;
                map.delete(callback);
                if(!map.size){
                    clearInterval(timer.tid);
                    delete _timeobj[time];
                }
            }
        }
    }
}

