
var game_file_list = [
    //以下为自动修改，请勿修改
    //----auto game_file_list start----
	"libs/modules/egret/egret.js",
	"libs/modules/egret/egret.native.js",
	"libs/modules/RES/RES.js",
	"bin-debug/Data.js",
	"bin-debug/junyou/common/RecyclablePool.js",
	"bin-debug/junyou/common/CallbackInfo.js",
	"bin-debug/junyou/common/configs/ConfigUtils.js",
	"bin-debug/junyou/common/configs/DataLocator.js",
	"bin-debug/junyou/common/configs/DataParseUtil.js",
	"bin-debug/junyou/common/configs/ICfg.js",
	"bin-debug/junyou/common/constant/KeyStroke.js",
	"bin-debug/junyou/common/constant/RequestState.js",
	"bin-debug/junyou/common/Extend.js",
	"bin-debug/junyou/common/Extension.js",
	"bin-debug/junyou/common/Global.js",
	"bin-debug/junyou/common/structure/ByteArray.js",
	"bin-debug/junyou/common/structure/Int64.js",
	"bin-debug/junyou/common/time/DateUtils.js",
	"bin-debug/junyou/common/time/TimeVO.js",
	"bin-debug/junyou/common/utils/ColorUtil.js",
	"bin-debug/junyou/common/utils/LangUtil.js",
	"bin-debug/junyou/common/utils/RequestLimit.js",
	"bin-debug/junyou/debug/ThrowError.js",
	"bin-debug/junyou/common/utils/Temp.js",
	"bin-debug/junyou/common/utils/TimerUtil.js",
	"bin-debug/junyou/debug/ClientCheck.js",
	"bin-debug/junyou/debug/Logger.js",
	"bin-debug/junyou/debug/ThrowErrorHelper.js",
	"bin-debug/junyou/game/animation/ActionInfo.js",
	"bin-debug/junyou/game/animation/BaseRender.js",
	"bin-debug/junyou/game/animation/FrameInfo.js",
	"bin-debug/junyou/game/animation/IDrawInfo.js",
	"bin-debug/junyou/game/animation/IRenderAction.js",
	"bin-debug/junyou/game/animation/JTexture.js",
	"bin-debug/junyou/game/animation/PstInfo.js",
	"bin-debug/junyou/game/animation/ResourceBitmap.js",
	"bin-debug/junyou/game/animation/SplitUnitResource.js",
	"bin-debug/junyou/game/animation/UnitResource.js",
	"bin-debug/junyou/game/IDepth.js",
	"bin-debug/junyou/game/resource/IResource.js",
	"bin-debug/junyou/game/resource/Resource.js",
	"bin-debug/junyou/game/resource/ResourceManager.js",
	"bin-debug/junyou/game/unit/UnitRender.js",
	"bin-debug/junyou/game/utils/FaceToUtils.js",
	"bin-debug/junyou/game/utils/GDataParseUtils.js",
	"bin-debug/Main.js",
	"bin-debug/Step1.js",
	//----auto game_file_list end----
];

var window = this;

egret_native.setSearchPaths([""]);

egret_native.requireFiles = function () {
    for (var key in game_file_list) {
        var src = game_file_list[key];
        require(src);
    }
};

egret_native.egretInit = function () {
    egret_native.requireFiles();
    egret.TextField.default_fontFamily = "/system/fonts/DroidSansFallback.ttf";
    //egret.dom为空实现
    egret.dom = {};
    egret.dom.drawAsCanvas = function () {
    };
};

egret_native.egretStart = function () {
    var option = {
        //以下为自动修改，请勿修改
        //----auto option start----
		entryClassName: "Main",
		frameRate: 30,
		scaleMode: "showAll",
		contentWidth: 480,
		contentHeight: 800,
		showPaintRect: false,
		showFPS: false,
		fpsStyles: "x:0,y:0,size:30,textColor:0x00c200,bgAlpha:0.9",
		showLog: false,
		logFilter: "",
		maxTouches: 2,
		textureScaleFactor: 1
		//----auto option end----
    };

    egret.native.NativePlayer.option = option;
    egret.runEgret();
    egret_native.Label.createLabel(egret.TextField.default_fontFamily, 20, "", 0);
    egret_native.EGTView.preSetOffScreenBufferEnable(true);
};