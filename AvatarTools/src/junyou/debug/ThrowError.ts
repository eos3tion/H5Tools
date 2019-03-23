module junyou{
    
    /**
	 * 抛错
	 * @param msg 	#String 描述
	 * @param atWho	#Array  at给谁<br/>
	 * 									<ol start="0">
	 * 										<li>前端</li>
	 * 										<li>后端</li>
	 * 										<li>策划</li>
	 * 									</ol>
	 **/
    export function ThrowError(msg:string,...atWho){
        if(DEBUG){
            var msg = ThrowErrorHelper.getMsg(msg,atWho);
            alert(msg);
        }
        if(RELEASE){
            msg = ThrowErrorHelper.pushMsg(msg,atWho);            
        }
        console.error(msg);
    }
}