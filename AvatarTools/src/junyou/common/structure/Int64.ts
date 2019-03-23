module junyou {
	/**
	 * 项目中不使用long类型，此值暂时只用于存储Protobuff中的int64 sint64
	 * @author 
	 *
	 */
	export class Int64 {
    	
    	/**
    	 * 高位
    	 */ 
    	public high:number;
    	/**
    	 * 低位
    	 */ 
    	public low:number;
    	
		public constructor() {
		}
	}
}
