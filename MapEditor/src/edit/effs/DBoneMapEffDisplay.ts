import { MapEffDetailFragment, MapEffFactory, MapEffRender } from "./MapEffDisplay";
import * as $path from "path";
const path: typeof $path = nodeRequire("path");
import * as $fs from "fs";
const fs: typeof $fs = nodeRequire("fs");
import { Core, log } from "../../Core";
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
    type = jy.MapEffType.DBone;
    display = new egret.Sprite()

    db: dragonBones.EgretArmatureDisplay;
    detail: MapEffDetailFragment;
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
        return getDBMapEffUri(this.folder, this.armature, this.ani);
    }

    create(folder: string) {
        let changed = false;
        if (this.folder != folder) {
            this.folder = folder;
        }
        let factory = dbFactorys[folder];
        this.factory = factory;
        if (!factory || changed) {
            this.armature = undefined;
            this.arm = undefined;
            if (!factory) {
                return log(`无效的[folder:${folder}]`);
            }
        }
    }
    setArmature(armature?: string) {
        let factory = this.factory;
        if (factory) {
            let ske = factory.$ske;
            let arm: Armature;
            if (!armature) {
                arm = ske.armature[0];
                if (arm) {
                    armature = arm.name;
                }
            }
            if (armature != this.armature) {
                this.armature = armature;
                let old = this.db;
                if (old) {
                    jy.removeDisplay(old);
                    old.dispose();
                    this.db = undefined;
                }


                if (!arm && armature) {
                    arm = ske.armature.find(item => item.name == armature);
                }
                this.arm = arm;
                if (!arm) {
                    return log(`无效的[armature:${armature}]`);
                }
                let db = factory.buildArmatureDisplay(armature);
                this.db = db;
                this.display.addChild(db);
            }
        }
    }

    playAni(ani?: string) {
        let { arm, db } = this;
        if (arm && db) {
            if (!ani) {
                ani = arm.animation?.[0]?.name;
            }
            if (ani != this.ani) {
                this.ani = ani;
                if (!ani) {
                    return log(`无效的[animation:${ani}]`);
                }
            }
            if (ani) {
                db.animation.play(ani);
            }
        }
        jy.dispatch(AppEvent.EffectChange, this);
    }

    onRecycle() {
        let db = this.db;
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

function init() {
    const detail = document.createElement("div") as MapEffDetailFragment;
    detail.id = "DBoneMapEffDetails";
    const divArm = document.createElement("div");
    divArm.appendChild(document.createTextNode("骨架："));
    const selectArm = document.createElement("select");
    divArm.appendChild(selectArm);
    selectArm.addEventListener("change", onArmChange)
    const divAni = document.createElement("div");
    divAni.appendChild(document.createTextNode("动画："));
    const selectAni = document.createElement("select");
    selectAni.addEventListener("change", onAniChange);
    divAni.appendChild(selectAni);
    detail.appendChild(divArm);
    detail.appendChild(divAni);
    let curRender: DBoneMapEffRender;
    let curFactory: DBFactory;
    let armFlag = true;
    let aniFlag = true;
    detail.show = function (render: DBoneMapEffRender) {
        curRender = render;
        if (render) {
            armFlag = false;
            let { factory, armature } = render;
            if (curFactory != factory) {
                curFactory = factory;
                let $arms = factory.$arms;
                $arms.sort();
                selectArm.innerHTML = "";
                let find = false;
                for (let i = 0; i < $arms.length; i++) {
                    const arm = $arms[i];
                    let option = document.createElement("option");
                    option.text = option.value = arm;
                    if (arm == armature) {
                        option.selected = true;
                        find = true;
                    }
                    selectArm.appendChild(option);
                }
                if (!find) {
                    selectArm.selectedIndex = 0;
                }
            }
            armFlag = true;
            onArmChange();
        }

    }

    function onArmChange() {
        if (!armFlag) {
            return
        }
        if (curRender) {
            aniFlag = false;
            curRender.setArmature(selectArm.value);
            let arm = curRender.arm;
            selectAni.innerHTML = "";
            if (arm) {
                let ani = curRender.ani;
                let anis = arm.animation;
                if (anis) {
                    let find = false;
                    for (let i = 0; i < anis.length; i++) {
                        const a = anis[i];
                        let option = document.createElement("option");
                        let name = a.name;
                        option.text = option.value = name;
                        if (name == ani) {
                            option.selected = true;
                            find = true;
                        }
                        selectAni.appendChild(option);
                    }
                    if (!find) {
                        selectAni.selectedIndex = 0;
                    }
                }
            }

            aniFlag = true;
            onAniChange()
        }
    }

    function onAniChange() {
        if (!aniFlag) {
            return
        }
        if (curRender) {
            let v = selectAni.value;
            if (v) {
                curRender.playAni(v);
            }
        }
    }


    DBoneMapEffRender.prototype.detail = detail;
}

let dbFactorys = {} as { [uri: string]: DBFactory }

export function getDBMapEffInfo(key: string) {
    const [uri, armature, ani] = key.split("|");
    return {
        uri,
        armature,
        ani
    }
}

export function getDBMapEffUri(uri: string, armature: string, ani: string) {
    return `${uri}|${getStr(armature)}|${getStr(ani)}`
}
async function prepare(key: string) {
    const { uri, armature, ani } = getDBMapEffInfo(key);
    let p = getPath(uri);
    if (await prepareAndCheck(p)) {
        return { fullPath: p, uri, armature, ani };
    }
}

function getPath(uri: string) {
    return path.join(Core.basePath, Core.cfg.dbonePath, uri);
}

async function prepareAndCheck(p: string) {
    if (!fs.existsSync(p)) {
        return log(`无法找到龙骨文件夹[${p}]`);
    }
    let fstats = fs.statSync(p);
    if (!fstats.isDirectory()) {
        return log(`龙骨文件夹不正确`)
    }
    let uri = path.basename(p);
    if (!dbFactorys[uri]) {
        let skeFile = path.join(p, DBFile.Skeleton);
        let texFile = path.join(p, DBFile.Texture);
        let texDataFile = path.join(p, DBFile.TextureData);
        if (!fs.existsSync(skeFile) || !fs.existsSync(texFile) || !fs.existsSync(texDataFile)) {
            return log(`龙骨文件夹[${p}]中文件不正确，请检查是否有"${DBFile.Skeleton}","${DBFile.Texture}","${DBFile.TextureData}"`);
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
            render.setArmature();
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
        render.create(uri);
        render.setArmature(armature);
        render.playAni(ani);
        return render;
    }
}


export const DBoneMapEffFactory = {
    checkAndGetRender,
    prepare: async function (effData: MapEffData) {
        await prepare(effData.uri);
    },
    create,
    init
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
