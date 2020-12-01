import { MapEffFactory, MapEffRender } from "./MapEffDisplay";
import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import { Core } from "../../Core";
import { addRes } from "../../res/Res";
interface DBFactory extends dragonBones.EgretFactory {
    $ske: DBoneSke;

    $arms: string[]
};
const enum DBFile {
    /**
     * 纹理
     */
    Texture = "d_tex.png",
    /**
     * 纹理数据
     */
    TextureData = "d_tex.json",
    /**
     * 骨骼
     */
    Skeleton = "d_ske.json",
}
function getStr(str: string) {
    if (str != undefined) {
        return str
    } else {
        return "";
    }
}
export class DBoneMapEffRender implements MapEffRender {
    display: dragonBones.EgretArmatureDisplay;

    /**
     * 资源标识
     */
    folder: string;
    /**
     * 骨架名
     */
    armature: string;
    /**
     * 动画名
     */
    ani: string;
    factory: DBFactory;
    arm: Armature;

    get uri() {
        return `${this.folder}|${getStr(this.armature)}|${getStr(this.ani)}`
    }

    create(folder: string, armature?: string) {
        let changed = false;
        if (this.folder != folder) {
            this.folder = folder;
            changed = true;
        }
        let factory = dbFactorys[folder];
        this.factory = factory;
        if (!factory) {
            this.armature = undefined;
            this.arm = undefined;
            return alert(`无效的[folder:${folder}]`);
        }
        let ske = factory.$ske;
        let arm: Armature;
        if (!armature) {
            arm = ske.armature[0];
            if (arm) {
                armature = arm.name;
            }
        }
        if (changed || armature != this.armature) {
            this.armature = armature;
            changed = true;
        }
        if (changed) {
            let old = this.display;
            if (old) {
                old.dispose();
            }
        }

        if (!arm && armature) {
            arm = ske.armature.find(item => item.name == armature);
        }
        this.arm = arm;
        if (!arm) {
            return alert(`无效的[armature:${armature}]`);
        }
        let db = factory.buildArmatureDisplay(armature);
        this.display = db;
    }

    playAni(ani?: string) {
        let { arm, display } = this;
        if (arm) {
            if (!ani) {
                ani = arm.animation?.[0]?.name;
            }
            if (ani != this.ani) {
                this.ani = ani;
                if (!ani) {
                    return alert(`无效的[animation:${ani}]`);
                }
                if (ani) {
                    display.animation.play(ani);
                }
            }
        }
    }

    onRecycle() {
        let db = this.display;
        if (db) {
            this.display = undefined;
            jy.removeDisplay(db);
            db.dispose();
        }
        this.factory = undefined;
        this.arm = undefined;
        this.armature = undefined;
        this.ani = undefined;
        this.folder = undefined;
    }
}

let dbFactorys = {} as { [uri: string]: DBFactory }

async function prepare(key: string) {
    const [uri, armature, ani] = key.split("|");
    let p = getPath(uri);
    if (await prepareAndCheck(p)) {
        return { fullPath: p, uri, armature, ani };
    }
}

function getPath(uri: string) {
    return path.join(Core.basePath, Core.cfg.dbonePath, uri);
}

async function prepareAndCheck(p: string) {
    let fstats = fs.statSync(p);
    if (!fstats.isDirectory()) {
        return alert(`龙骨文件夹不正确`)
    }
    let uri = path.basename(p);
    if (!dbFactorys[uri]) {
        let skeFile = path.join(p, DBFile.Skeleton);
        let texFile = path.join(p, DBFile.Texture);
        let texDataFile = path.join(p, DBFile.TextureData);
        if (!fs.existsSync(skeFile) || !fs.existsSync(texFile) || !fs.existsSync(texDataFile)) {
            return alert(`龙骨文件夹[${p}]中文件不正确，请检查是否有"${DBFile.Skeleton}","${DBFile.Texture}","${DBFile.TextureData}"`);
        }
        addRes(skeFile, skeFile);
        addRes(texFile, texFile);
        addRes(texDataFile, texDataFile);
        let factory = await new Promise<DBFactory>((resolve) => {
            jy.Res.loadList([{ uri: skeFile, url: skeFile }, { uri: texFile, url: texFile }, { uri: texDataFile, url: texDataFile }], {
                callback: jy.CallbackInfo.get(getResList, null, resolve, p), group: p
            })
        })
        dbFactorys[uri] = factory;
    }
    return uri;
}

function getResList(flag: boolean, resolve: { (factory: DBFactory) }, folder: string) {
    let factory: DBFactory;
    if (flag) {
        const dbData = jy.Res.get(path.join(folder, DBFile.Skeleton)) as DBoneSke;
        const tex = jy.Res.get(path.join(folder, DBFile.Texture));
        const texData = jy.Res.get(path.join(folder, DBFile.TextureData));
        factory = new dragonBones.EgretFactory() as DBFactory;
        factory.$ske = dbData;
        factory.$arms = dbData.armature?.map(item => item.name);
        factory.parseDragonBonesData(dbData);
        factory.parseTextureAtlasData(texData, tex);
    }
    resolve(factory);
}

async function checkAndGetRender(files: FileList) {
    let file = files[0];
    if (file) {
        let p = file.path;
        let uri = await prepareAndCheck(p);
        if (uri) {
            let render = jy.recyclable(DBoneMapEffRender);
            render.create(uri);
            render.playAni();
            return render;
        }
    }
}

async function create(eff: MapEffData) {
    //路径以 uri|armature|ani  分隔
    let p = await prepare(eff.uri);
    if (p) {
        const { uri, armature, ani } = p;
        let render = jy.recyclable(DBoneMapEffRender);
        render.create(uri, armature);
        render.playAni(ani);
        return render;
    }
}


export const DBoneMapEffFactory = {
    checkAndGetRender,
    prepare: async function (effData: MapEffData) {
        await prepare(effData.uri);
    },
    create
} as MapEffFactory;


// Generated by https://quicktype.io

export interface DBoneSke {
    frameRate: number;
    name: string;
    version: string;
    compatibleVersion: string;
    armature: Armature[];
}

export interface Armature {
    type: string;
    frameRate: number;
    name: string;
    aabb: AABB;
    bone: ArmatureBone[];
    slot: ArmatureSlot[];
    skin: Skin[];
    animation: Animation[];
    defaultActions: DefaultAction[];
}

export interface AABB {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Animation {
    duration: number;
    playTimes: number;
    name: string;
    bone: AnimationBone[];
    slot: AnimationSlot[];
}

export interface AnimationBone {
    name: string;
    translateFrame: EFrame[];
    scaleFrame?: EFrame[];
}

export interface EFrame {
    duration?: number;
    tweenEasing?: number;
    x?: number;
    y?: number;
}

export interface AnimationSlot {
    name: string;
    colorFrame: ColorFrame[];
}

export interface ColorFrame {
    duration: number;
    tweenEasing?: number;
    value?: Value;
}

export interface Value {
    aM?: number;
    gM?: number;
    bM?: number;
}

export interface ArmatureBone {
    name: string;
    parent?: Parent;
    transform?: Transform;
    length?: number;
}

export enum Parent {
    Root = "root",
}

export interface Transform {
    x: number;
    y: number;
    skX?: number;
    skY?: number;
}

export interface DefaultAction {
    gotoAndPlay: string;
}

export interface Skin {
    slot: SkinSlot[];
}

export interface SkinSlot {
    name: string;
    display: Display[];
}

export interface Display {
    name: string;
    path?: string;
    transform?: Transform;
}

export interface ArmatureSlot {
    name: string;
    parent: string;
    color?: Color;
    blendMode?: string;
}

export interface Color {
    gM: number;
    bM: number;
}
