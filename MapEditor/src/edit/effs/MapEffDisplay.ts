import { AniDele } from "../AniDele";
import { AniMapEffFactory } from "./AniMapEffDisplay";

export interface MapEffRender {
    display: egret.DisplayObject;
    uri: string;
    onRecycle();
}
export interface FileArray {
    length: number;
    [index: number]: File | string;
}

export interface MapEffFactory {
    checkFile(files: FileArray, parent?: string): jy.Recyclable<MapEffRender> | void;

    prepare(effData: MapEffData): void;
    create(effData: MapEffData): jy.Recyclable<MapEffRender> | void;
}

const dict = {} as { [type: number]: MapEffFactory };

function getFactory(type: number) {
    type = type | 0;
    return dict[type];
}

export function regMapEffFactory(type: number, factory: MapEffFactory) {
    dict[type] = factory;
}

/**
 * 检查文件列表，区分类型
 * @param file 
 */
export async function checkDrop(e: DragEvent) {
    let files = e.dataTransfer.files;
    for (let type in dict) {
        const factory = dict[type];
        let render = await factory.checkFile(files);
        if (render) {
            let { clientX, clientY } = e;
            //将坐标转换到game上
            let dpr = window.devicePixelRatio;
            let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
            let dele = new AniDele({ uri: render.uri, layerID: jy.GameLayerID.CeilEffect, sX: 1, sY: 1, rotation: 0 }, render);
            dele.setStartPoint(pt.x, pt.y);
            $engine.effs.pushOnce(dele);
            break
        }
    }
}

export function prepareEffs(effDatas: MapEffData[]) {
    for (let i = 0; i < effDatas.length; i++) {
        let eff = effDatas[i];
        let factory = getFactory(eff.type);
        if (factory) {
            factory.prepare(eff);
        }
    }
}

export function createEffs(effDatas: MapEffData[], effs: AniDele[]) {
    for (let i = 0; i < effDatas.length; i++) {
        let eff = effDatas[i];
        let render = createEff(eff);
        if (render) {
            let dele = new AniDele(eff, render);
            effs.push(dele);
        }
    }
}

export function createEff(eff: MapEffData) {
    let factory = getFactory(eff.type);
    if (factory) {
        return factory.create(eff);
    }
}


regMapEffFactory(jy.MapEffType.Ani, AniMapEffFactory)