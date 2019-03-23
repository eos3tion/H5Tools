module junyou {
	/**
	 * 临时对象
	 * @author 
	 *
	 */
    export class Temp {
    	/**
    	 * 共享数组1
    	 */
        public static SharedArray1: any[] = [];
        /**
         * 共享数组2
         */
        public static SharedArray2: any[] = [];
        /**
         * 共享数组3
         */
        public static SharedArray3: any[] = [];

        /**
         * 共享点1
         */
        public static SharedPoint1 = new egret.Point();

        /**
         * 共享点2
         */
        public static SharedPoint2 = new egret.Point();

        /**
         * 共享的矩形
         */
        public static SharedRect = new egret.Rectangle();

        /**
		 * 不做任何事情的空方法，接收任意长度的数据，返回空
		 */
        public static voidFunction = function (...args): any {
        };

        /**
         * 用于替换的方法,接收任意长度的数据，返回null
         */
        public static willReplacedFunction = function (...args): any {
            if (DEBUG) {
                ThrowError("需要被替换的方法，没有被替换");
            }
            return null;
        };

        public constructor() {
        }
    }
}
