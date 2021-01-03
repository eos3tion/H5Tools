import { Core } from "../Core";
import { TiledMap } from "./TiledParser";
const enum Const {
    MaxIndicesCount = 12288,
    IndicesCount = 6,
}


export function initTiledMap(data: TiledMap) {
    const tileDict = Core.tileDict;
    const layers = data.layerData;
    let lid = 1720;
    jy.GameEngine.addLayerConfig(lid, jy.GameLayerID.GameScene, jy.BaseLayer);
    let layer = $engine.getLayer(lid) as jy.BaseLayer;

    const { tileWidth, tileHeight, cols: cols, rows: rows } = data;
    const hh = tileHeight >> 1;
    let hw = tileWidth >> 1;
    let lashHash: number;
    return {
        setRect({ left, top, right, bottom }: egret.Rectangle) {
            let sx = left / tileWidth | 0;
            let sy = top / hh | 0;
            if (sy > 0) {
                sy--;
            }
            if (sx > 0) {
                sx--;
            }
            let ex = Math.ceil(right / tileWidth) + 1;
            let ey = Math.ceil(bottom / hh) + 1;
            if (ex > cols) {
                ex = cols;
            }
            if (ey > rows) {
                ey = rows;
            }

            let hash = (sy * cols + sx) * 1E8 + ey * cols + ex;
            if (hash != lashHash) {
                lashHash = hash;
                let lastTexture: egret.Texture;
                let children = layer.$children;
                let ci = 0;
                let mesh: egret.Mesh, count = 0, idx = 0;
                for (let i = 0; i < layers.length; i++) {
                    const data = layers[i];
                    for (let y = sy; y < ey; y++) {
                        let s = y * cols;
                        let oy = y * hh;
                        let oxx = y & 1 ? hw : 0;
                        for (let x = sx; x < ex; x++) {
                            let tid = data[s + x];
                            if (tid) {
                                let tile = tileDict[tid];
                                if (tile) {
                                    const { uvs: cuvs, verts: cverts, texture } = tile;
                                    let flag = false;
                                    if (lastTexture != texture) {
                                        lastTexture = texture;
                                        flag = true;
                                    }
                                    if (!flag) {
                                        if (mesh && count > Const.MaxIndicesCount - Const.IndicesCount) {
                                            flag = true;
                                        }
                                    }
                                    if (flag) {
                                        if (mesh) {
                                            (mesh.$renderNode as egret.sys.MeshNode).indices = egret.SharedIndices.subarray(0, count) as any;
                                            mesh.$updateVertices();
                                        }
                                        mesh = children[ci++] as egret.Mesh;
                                        if (!mesh) {
                                            mesh = jy.recyclable(egret.Mesh);
                                            layer.addChild(mesh, false);
                                        }
                                        mesh.texture = texture;
                                        count = 0;
                                        idx = 0;
                                    }
                                    const { uvs, vertices } = mesh.$renderNode as egret.sys.MeshNode;
                                    let ox = x * tileWidth + oxx;
                                    for (let xi = 0; xi < 8; xi++) {
                                        uvs[idx] = cuvs[xi];
                                        vertices[idx] = cverts[xi] + (xi & 1 ? oy : ox);
                                        idx++;
                                    }
                                    count += Const.IndicesCount;
                                }
                            }
                        }
                    }
                }
                if (mesh) {
                    (mesh.$renderNode as egret.sys.MeshNode).indices = egret.SharedIndices.subarray(0, count) as any;
                    mesh.$updateVertices();
                }
                //移除多余的
                for (let i = children.length - 1; i >= ci; i--) {
                    let mesh = layer.removeChildAt(i, false) as jy.Recyclable<egret.Mesh>;
                    mesh.texture = null;
                    mesh.recycle();
                }
            }
        }
    }
}