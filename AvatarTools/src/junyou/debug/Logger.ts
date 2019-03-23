module junyou {
	/**
	 * 
	 * @author 3tion
	 * 暂时使用console相关
	 * TODO 后期可以调整为将日志输出到特定服务器记录，已方便远程调试
	 */
	export class Logger {

		public static warn = console.warn;

		public static log = console.log;

		public static error = console.error;

		public static debug = console.debug;
	}
}
