module junyou {
	/**
	 * 请求限制
	 * @author 3tion
	 *
	 */
	export class RequestLimit {
    	
        private static dic: { [index: string]:number}={};
        
        private dic: { [index: string]: number } = {};
    	
		public constructor() {
		}
		
		/**
		 * @param o 锁定的对像(可以是任何类型,它会被当做一个key)
		 * @param time 锁定对像 毫秒数
		 * @return 是否已解锁 true为没有被限制,false 被限制了
		 *
		 */
        public check(o:number|string, time:number = 500):Boolean
		{
            var dic = this.dic;
            var t: any=dic[o];
            var now: number = Global.now;
            if(t == null) {
                dic[o] = time + now;
                return true;
            }
    
            var i: number = t - now;
            if(i > 0) {
                //				dic[o]=i;
                return false;
            }
    
            dic[o] = time + now;
            return true;
        }

        /**
         * 删除 
         * @param o
         *
         */		
        public remove(o: number | string): void {
            delete this.dic[o];
        }
        
        
        private static instance:RequestLimit = new RequestLimit();
        
        /**
		 * @param o 锁定的对像(可以是任何类型,它会被当做一个key)
		 * @param time 锁定对像 毫秒数
		 * @return 是否已解锁 true为没有被限制,false 被限制了
		 *
		 */
        public static check(o: number | string,time: number = 500): Boolean
        {
            return RequestLimit.instance.check(o,time);
        }
        
        /**
         * 删除 
         * @param o
         *
         */
        public static remove(o: number | string): void {
            return RequestLimit.instance.remove(o);
        }
	}
}
