(function(){
	hljs.loadLanguage = function(language){
		if(!hljs.getLanguage(language)){
			var url = getCurrAbsPath() + "languages/"+language+".js";
			load(url,function(value){
				eval("var func = " + value)
				hljs.registerLanguage(language, func);
			});
		}
	}
	function getCurrAbsPath(){  
	  var a = {}, stack;
	  try{
	   a.b();
	  }
	  catch(e){
	   stack = e.stack || e.sourceURL || e.stacktrace; 
	  }
	  var rExtractUri = /((?:http|https|file):\/\/.*?\/)[^/]+?.js/, 
		absPath = rExtractUri.exec(stack);
	  return absPath[1] || '';
	}
	function load(url,callback){
		var loader;
		if (window["XMLHttpRequest"]) {
			loader = new window["XMLHttpRequest"]();
		} else {
			loader = new ActiveXObject("MSXML2.XMLHTTP");
		}
		loader.onreadystatechange = function() {
			if (loader.readyState == 4) { // 4 = "loaded"
				var ioError = (loader.status >= 400 || loader.status == 0);
				if (!ioError) { //请求错误
					callback(loader.responseText);
				}
			}
		}
		loader.open("GET", url, true);
		loader.responseType = "";
		loader.send();
	}
	
})()