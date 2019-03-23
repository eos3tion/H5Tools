module junyou {
	/**
	 * 动画的全局对象
	 * @author 
	 *
	 */
	export class Global {

    	/**
    	 * 注入白鹭的全局Ticker
    	 */
    	public static initTick(){
            let ticker = egret.sys.$ticker;
            let update = ticker.update;
            let delta = 0 | 1000 / ticker.$frameRate;
            ticker.update = ()=>{
                this.now = Date.now();
                this.frameNow += delta;
                update.call(ticker);
                
            }
    	}
        
    	/**
    	 *  当前这一帧的时间
    	 */
    	public static now:number;
    	
    	
    	/**
    	 * 按照帧，应该走的时间
    	 * 每帧根据帧率加固定时间
    	 * 用于处理逐帧同步用
    	 */
    	public static frameNow:number=0;

    	
		public constructor() {
		}
	}
}
