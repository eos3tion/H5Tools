import { AniDele } from "../AniDele";
import { AniMapEffFactory } from "./AniMapEffDisplay";
import { DBoneMapEffFactory } from "./DBoneMapEffDisplay";
export interface MapEffDetailFragment extends HTMLDivElement {
    id: string;
    show(render: MapEffRender);
}

export interface MapEffRender {
    display: egret.DisplayObject;
    uri: string;
    /**
     * 附加的默认内容
     */
    detail?: MapEffDetailFragment;
    onRecycle();
}
export interface FileArray {
    length: number;
    [index: number]: File | string;
}

export interface MapEffFactory {

    init?();
    checkAndGetRender(files: FileList): Promise<jy.Recyclable<MapEffRender> | void>;

    prepare(effData: MapEffData): Promise<void>;
    create(effData: MapEffData): Promise<jy.Recyclable<MapEffRender> | void>;
}

const dict = {} as { [type: number]: MapEffFactory };

function getFactory(type: number) {
    type = type | 0;
    return dict[type];
}

function regMapEffFactory(type: number, factory: MapEffFactory) {
    dict[type] = factory;
    factory.init?.();
}

/**
 * 检查文件列表，区分类型
 * @param file 
 */
export async function checkDrop(e: DragEvent, effs: AniDele[]) {
    let files = e.dataTransfer.files;
    for (let type in dict) {
        const factory = dict[type];
        let render = await factory.checkAndGetRender(files);
        if (render) {
            let { clientX, clientY } = e;
            //将坐标转换到game上
            let dpr = window.devicePixelRatio;
            let pt = $engine._bg.globalToLocal(clientX / dpr, clientY / dpr);
            let dele = new AniDele({ type: +type, uri: render.uri, layerID: jy.GameLayerID.CeilEffect, sX: 1, sY: 1, rotation: 0 }, render);
            dele.setStartPoint(pt.x, pt.y);
            effs.pushOnce(dele);
            break
        }
    }
}

export async function prepareEffs(effDatas: MapEffData[]) {
    for (let i = 0; i < effDatas.length; i++) {
        let eff = effDatas[i];
        let factory = getFactory(eff.type);
        if (factory) {
            await factory.prepare(eff);
        }
    }
}

export async function createEffs(effDatas: MapEffData[], effs: AniDele[]) {
    for (let i = 0; i < effDatas.length; i++) {
        let eff = effDatas[i];
        let render = await createEff(eff);
        if (render) {
            let dele = new AniDele(eff, render);
            effs.push(dele);
        }
    }
}

export async function createEff(eff: MapEffData) {
    let factory = getFactory(eff.type);
    if (factory) {
        return factory.create(eff);
    }
}

export function regMapEffFactorys() {
    regMapEffFactory(jy.MapEffType.Ani, AniMapEffFactory);
    regMapEffFactory(jy.MapEffType.DBone, DBoneMapEffFactory);
}