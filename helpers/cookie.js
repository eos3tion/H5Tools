var cookie = {
    /**
     * 设置cookie
     * 
     * @param name 
     * @param value 
     */
    setCookie: function(name, value) {
		if(value!=undefined){
			localStorage.setItem(name,JSON.stringify(value));
		}else{
			cookie.delCookie(name);
		}
    },

    /**
     * 获取cookie
     * 
     * @param name 
     * @returns
     */
    getCookie: function(name) {
		 var data = localStorage.getItem(name);
		 if (data != null) {
			try{
				var dat = JSON.parse(data);
			}catch(e)
			{
				dat = data;
			}
			 return dat;
		 }
    },

    /**
     * 删除cookie
     * 
     * @param name
     */
    delCookie: function(name) {        
        localStorage.removeItem(name);
    }
}