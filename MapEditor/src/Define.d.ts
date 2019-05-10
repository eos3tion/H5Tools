declare const enum ConstString {
    /**
     * 地图编辑器的配置文件
     */
    CfgFileName = "MapEditor.json",
    /**
     * 库文件
     */
    LibPath = "lib",
    /**
     * 单张地图的配置数据
     */
    MapCfgFileName = "map.json",

    ProjectName = "MapEditor",

    CookiePrefix = "MapEditor_",

    Mini = "mini",

    AniDataFile = "d.json",

    AniImageFile = "a0.png",

    /**
     * java的文件路径
     */
    JavaMapPath = "path.mm",
}

declare const enum ConstNum {
    PicSize = 256,
}

declare const enum AppState {
    /**
     * 选地图路径的阶段
     */
    SelectMapDir,
    /**
     * 检查/设置地图基础信息阶段
     */
    EditMapInfo,
    /**
     * 编辑地图阶段
     */
    Edit
}

declare const enum AppEvent {
    /**
     * 状态发生改变 
     * data[0] {AppState} 要进入的状态
     * data[1] {any} 数据
     */
    StateChange = 100,

    /**
     * 移除效果  
     * data {AniDele}
     */
    RemoveEffect,
    /**
     * 复制一份效果
     * data {AniDele}
     */
    CopyEffect,
}

interface GlobalCfg {

    /**
     * 存储配置或者执行其他操作时，执行的脚本
     */
    endAction?: string;

    /**
     * 特效路径，默认使用 "../a" 目录
     */
    effectPath?: string;
}

/**
* 地图特效
*/
interface MapEffData {
    x?: number;
    y?: number;
    /**
     * 特效uri
     */
    uri: string;

    /**
     * 所在图层ID
     */
    layerID?: number;
    /**
     * 层标识
     */
    layer?: number;
    /**
     * 缩放X
     */
    sX?: number;
    /**
     * 缩放Y
     */
    sY?: number;
    scaleX?: number;

    scaleY?: number;
    /**
     * 旋转
     */
    rotation?: number;
}

interface MovableMapEffData extends MapEffData {
    duration?: number;
    /**
     * 种子
     */
    seed?: number;

    /**
     * 移动速度X
     */
    speedX?: number;

    /**
     * 移动速度Y
     */
    speedY?: number;

}

interface ViewState {

    state: AppState;
    view: HTMLElement;
    setData?(data);
}

declare namespace jy {
    export interface MapInfo {
        effs: MapEffData[];

        meffs: MovableMapEffData[];

        /**
         * 文件样式
         * 1 000001 002003
         * 2 0_1 2_3
         */
        ftype?: number;

        /**
         * 地图数据的 base64字符串
         */
        pathdataB64?: string;


        /**
         * 透明点数据的 base64字符串
         */
        adataB64?: string;

        /**
         * 地图所有数据的base64字符串
         */
        mapBytesB64?: string;
    }

    export interface GameEngine {
        enterMap(map: jy.MapInfo);
        _bg: jy.TileMapLayer;
        effs: any[];
        invalidate();
    }

    export interface UnitResource {
        bmd: egret.BitmapData;
    }
}

interface Mini extends jy.Image {
    id: number;
}

interface Window {
    $engine: import("./edit/HGameEngine").HGameEngine;
}


declare var $engine: import("./edit/HGameEngine").HGameEngine;
declare var $gm: $gmType;