import { TiledMap, TiledMapLayerInfo } from "./TiledParser";

export function initTiledMap(data: TiledMap) {
    const layers = data.layers;
    let addLayerConfig = jy.GameEngine.addLayerConfig;
    const list = [] as TiledLayer[];
    let start = 1720;
    // id 从1720 到 1729
    for (let i = 0; i < layers.length; i++) {
        const layerData = layers[i];
        const lid = start + i;
        addLayerConfig(lid, jy.GameLayerID.GameScene, TiledLayer);
        let layer = $engine.getLayer(lid) as TiledLayer;
        layer.init(layerData);
        list.push(layer);
    }
    const { tileWidth, tileHeight, width: cols, height: rows } = data;
    const hh = tileHeight >> 1;
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

            for (const layer of list) {
                layer.setRect(sx, sy, ex, ey, tileWidth, hh);
            }
        }
    }
}


class TiledLayer extends egret.Sprite implements jy.GameLayer {

    id: number;
    data: TiledMapLayerInfo;
    map: TiledMap;

    meshs: { [hash: number]: egret.Mesh & { idx: number, count: number } };

    constructor(id: number) {
        super();
        this.id = id;
    }

    init(data: TiledMapLayerInfo) {
        this.data = data;
        let textures = data.textures;
        let meshs = {};
        this.removeChildren();
        for (let i = 0; i < textures.length; i++) {
            const tex = textures[i];
            let mesh = new egret.Mesh;
            meshs[tex.hashCode] = mesh;
            mesh.texture = tex;
            this.addChild(mesh);
        }
        this.meshs = meshs;
    }

    setRect(sx: number, sy: number, ex: number, ey: number, tw: number, hh: number) {

        const { tileDict, cfg: { width } } = this.data;
        const meshs = this.meshs;
        for (const hash in meshs) {
            let mesh = meshs[hash];
            mesh.idx = 0;
            mesh.count = 0;
        }
        let hTW = tw >> 1;
        for (let y = sy; y < ey; y++) {
            let s = y * width;
            let oy = y * hh;
            let oxx = y & 1 ? hTW : 0;
            for (let x = sx; x < ex; x++) {
                let tile = tileDict[s + x];
                if (tile) {
                    const { uvs: cuvs, vertices: cverts, texture } = tile;
                    const mesh = meshs[texture.hashCode];
                    const { uvs, vertices } = mesh.$renderNode as egret.sys.MeshNode;
                    let ox = x * tw + oxx;
                    let ui = mesh.idx;
                    for (let i = 0; i < 8; i++) {
                        uvs[ui] = cuvs[i];
                        vertices[ui] = cverts[i] + (i & 1 ? oy : ox);
                        ui++;
                    }
                    mesh.idx = ui;
                    mesh.count += 6;
                }
            }
        }
        for (const hash in meshs) {
            let mesh = meshs[hash];
            (mesh.$renderNode as egret.sys.MeshNode).indices = egret.SharedIndices.subarray(0, mesh.count) as any;
            mesh.$updateVertices();
        }
    }
}