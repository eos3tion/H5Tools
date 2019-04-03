import Point = egret.Point;
import Recyclable = jy.Recyclable;
import { Polygon } from "./Polygon";
import { Line, getLine } from "./Line";
import { Triangle } from "./Triangle";
import { getPoint } from "./Point";

function initData(polyV: Polygon[], vertexV: Point[], edgeV: Line[]) {
    let j = 0;
    for (let i = 0; i < polyV.length; i++) {
        let poly = polyV[i];
        let pVertexV = poly.vertexV;
        for (let k = 0; k < pVertexV.length; k++) {
            const v = pVertexV[k];
            let old = vertexV[j++];
            if (!old) {
                old = getPoint();
            }
            old.setTo(v.x, v.y);
        }


        poly.vertexV.appendTo(vertexV);
        putEdge(edgeV, poly.vertexV);
    }

    return polyV[0].vertexV.length;
}

function putEdge(dstV: Line[], srcV: Point[]): void {
    if (srcV.length < 3) return;	//不是一个多边形

    let p1 = srcV[0];
    let p2: Point;
    for (let i = 1; i < srcV.length; i++) {
        p2 = srcV[i];
        dstV.push(getLine(p1, p2));
        p1 = p2;
    }
    p2 = srcV[0];
    dstV.push(getLine(p1, p2));
}


export class Delaunay {
    /**
     * 所有多边形
     */
    polygonV = [] as Recyclable<Polygon>[];
    /**
     * 所有顶点列表, 前`outEdgeVecNum`个为外边界顶点
     */
    vertexV = [] as Recyclable<Point>[];
    /**
     * 所有约束边
     */
    edgeV = [] as Recyclable<Line>[];

    /**
     * 区域外边界顶点数
     */
    outEdgeVecNum: number;
    /**
     * 线段堆栈
     */
    LineV = [] as Recyclable<Line>[];

    /**
     * 生成的`Delaunay`三角形
     */
    triangleV = [] as Recyclable<Triangle>[];

    createDelaunay(polyV: Polygon[]) {
        initData(polyV, this.vertexV, this.edgeV);
    }
}