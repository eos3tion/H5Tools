import Point = egret.Point;
import Recyclable = jy.Recyclable;
import NavMeshConst = jy.NavMeshConst;
import { Polygon } from "./Polygon";
import Line = jy.Line;
import Triangle = jy.Triangle;



/**
 * Step2.	取任意一条外边界边 p1p2 .
 * @param outEdgeVecNum 
 * @param vertexV 
 * @param edgeV 
 */
function getInitOutEdge(outEdgeVecNum: number, vertexV: Point[], edgeV: Line[]) {
    let initEdge = edgeV[0];
    outEdgeVecNum--;
    //检查是否有顶点p在该边上，如果有则换一个外边界
    let loopSign: boolean;
    let loopIdx = 0;
    do {
        loopSign = false;
        loopIdx++;
        for (let i = 0; i < vertexV.length; i++) {
            const testV = vertexV[i];
            if (testV.equals(initEdge.pA) || testV.equals(initEdge.pB)) continue;
            if (initEdge.classifyPoint(testV, NavMeshConst.Epsilon) == jy.PointClassification.OnLine) {
                loopSign = true;
                initEdge = edgeV[loopIdx];
                break;
            }
        }
    } while (loopSign && loopIdx < outEdgeVecNum);	//只取外边界
    return initEdge;
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

function isVisiblePointOfLine(vec: Point, line: Line, edgeV: Line[]) {
    const { pA, pB } = line;
    if (vec.equals(pA)
        || vec.equals(pB)
        || line.classifyPoint(vec, NavMeshConst.Epsilon) != jy.PointClassification.RightSide //（1） p3 在边 p1p2 的右侧 (多边形顶点顺序为顺时针)；
        || !isVisibleIn2Point(pA, vec, edgeV) //（2） p3 与 p1 可见，即 p1p3 不与任何一个约束边相交；
        || !isVisibleIn2Point(pB, vec, edgeV) //（3） p3 与 p2 可见
    ) {
        return false;
    }
    return true;
}

const interscetVector = new Point();

function isVisibleIn2Point(pa: Point, pb: Point, edgeV: Line[]) {
    let linepapb = getLine(pa, pb);
    let flag = true;
    for (let i = 0; i < edgeV.length; i++) {
        const lineTmp = edgeV[i];
        //两线段相交
        if (linepapb.intersection(lineTmp, interscetVector) == jy.LineClassification.SegmentsIntersect) {
            //交点是不是端点
            if (!pa.equals(interscetVector) && !pb.equals(interscetVector)) {
                flag = false;
                break;
            }
        }
    }
    return flag;
}


function findDT(line: Line, vertexV: Point[], edgeV: Line[]) {
    const { pA: p1, pB: p2 } = line;
    const allVPoint = [] as Point[];		// line的所有可见点
    //搜索所有可见点 			TODO 按y方向搜索距线段终点最近的点
    let j = 0;
    for (let i = 0; i < vertexV.length; i++) {
        const vt = vertexV[i];
        if (isVisiblePointOfLine(vt, line, edgeV)) {
            allVPoint[j++] = vt;
        }
    }
    //			trace("vec:Vector2f in allVPoint:", allVPoint);
    if (j == 0) return;
    let p3 = allVPoint[0];
    //			trace("line", line);
    //			trace("p3", p3);
    let loopSign: boolean;
    do {
        loopSign = false;

        //Step1. 构造 Δp1p2p3 的外接圆 C（p1，p2，p3）及其网格包围盒 B（C（p1，p2，p3））
        const { xc, yc, sqR } = circumCircle(p1, p2, p3);

        //Step2. 依次访问网格包围盒内的每个网格单元：
        //		 若某个网格单元中存在可见点 p, 并且 ∠p1pp2 > ∠p1p3p2，则令 p3=p，转Step1；否则，转Step3.
        let angle132 = Math.abs(lineAngle(p1, p3, p2));	// ∠p1p3p2
        for (let i = 0; i < allVPoint.length; i++) {
            const vec = allVPoint[i];
            //					trace("测试点==================:", vec);
            if (vec.equals(p1) || vec.equals(p2) || vec.equals(p3)) {
                continue;
            }
            const { x: vx, y: vy } = vec;
            const dx = vx - xc;
            const dy = vy - yc;

            //不在包围盒中
            if (dx * dx + dy * dy - sqR > NavMeshConst.Epsilon) {
                continue;
            }

            //夹角
            let a1 = Math.abs(lineAngle(p1, vec, p2));
            //					trace("angle", a1, angle132);
            if (a1 > angle132) {
                /////转Step1
                p3 = vec;
                loopSign = true;
                break;
            }
        }
        ///////转Step3
    } while (loopSign);

    //			trace("findDT****** end ******");

    //Step3. 若当前网格包围盒内所有网格单元都已被处理完，
    //		 也即C（p1，p2，p3）内无可见点，则 p3 为的 p1p2 的 DT 点
    return p3;
}

function circumCircle(p1: Point, p2: Point, p3: Point) {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const { x: x3, y: y3 } = p3;
    /* Check for coincident points */
    const fabsy1y2 = Math.abs(y1 - y2);
    const fabsy2y3 = Math.abs(y2 - y3);
    if (fabsy1y2 < NavMeshConst.Epsilon && fabsy2y3 < NavMeshConst.Epsilon) {
        return;
    }

    const m1 = -(x2 - x1) / (y2 - y1);
    const m2 = -(x3 - x2) / (y3 - y2);
    const mx1 = (x1 + x2) / 2;
    const mx2 = (x2 + x3) / 2;
    const my1 = (y1 + y2) / 2;
    const my2 = (y2 + y3) / 2;
    let xc: number, yc: number;
    if (fabsy1y2 < NavMeshConst.Epsilon) {
        xc = (x2 + x1) / 2;
        yc = m2 * (xc - mx2) + my2;
    } else if (fabsy2y3 < NavMeshConst.Epsilon) {
        xc = (x3 + x2) / 2;
        yc = m1 * (xc - mx1) + my1;
    } else {
        xc = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
        yc = (fabsy1y2 > fabsy2y3) ?
            m1 * (xc - mx1) + my1 :
            m2 * (xc - mx2) + my2;

    }

    const dx = x2 - xc;
    const dy = y2 - yc;
    let sqR = dx * dx + dy * dy;
    return { xc, yc, sqR }
}
/**
 * 返回顶角在o点，起始边为os，终止边为oe的夹角, 即∠soe (单位：弧度) 
 * 角度小于pi，返回正值;   角度大于pi，返回负值 
 */
function lineAngle(s: Point, o: Point, e: Point) {
    let dsx = s.x - o.x;
    let dsy = s.y - o.y;
    let dex = e.x - o.x;
    let dey = e.y - o.y;

    let cosfi = dsx * dex + dsy * dey;
    let norm = (dsx * dsx + dsy * dsy) * (dex * dex + dey * dey);
    cosfi /= Math.sqrt(norm);

    if (cosfi >= 1.0) return 0;
    if (cosfi <= -1.0) return -Math.PI;

    let fi = Math.acos(cosfi);
    if (dsx * dey - dsy * dex > 0) return fi;      // 说明矢量os 在矢量 oe的顺时针方向 
    return -fi;
}

function indexOfVector(line: Line, vector: Line[]) {
    for (let i = 0; i < vector.length; i++) {
        let lt = vector[i];
        if (lt.equals(line)) return i;
    }
    return -1;
}





export function createDelaunay(polyV: Polygon[]) {
    //Step1. 	建立单元大小为 E*E 的均匀网格，并将多边形的顶点和边放入其中.
    //			其中 E=sqrt(w*h/n)，w 和 h 分别为多边形域包围盒的宽度、高度，n 为多边形域的顶点数 .

    /**
     * 所有顶点列表, 前`outEdgeVecNum`个为外边界顶点
     */
    let vertexV = [] as Point[];
    /**
     * 生成的`Delaunay`三角形
     */
    let triangleV = [] as Triangle[];

    /**
     * 所有约束边
     */
    let edgeV = [] as Recyclable<Line>[];

    let j = 0;
    for (let i = 0; i < polyV.length; i++) {
        let poly = polyV[i];
        let pVertexV = poly.points;
        pVertexV.appendTo(vertexV);
        putEdge(edgeV, pVertexV);
    }
    /**
     * 区域外边界顶点数
     */
    let outEdgeVecNum = polyV[0].points.length;
    let initEdge = getInitOutEdge(outEdgeVecNum, vertexV, edgeV);
    /**
     * 线段堆栈
     */
    const lineV = [] as Line[];
    lineV.push(initEdge);
    let t = 0;
    do {
        //Step3. 	计算 DT 点 p3，构成约束 Delaunay 三角形 Δp1p2p3 .
        let edge = lineV.pop();
        //				trace("开始处理edge###########:", edge);
        let p3 = findDT(edge, vertexV, edgeV);
        if (p3 == null) continue;
        const { pA, pB } = edge;
        let line13 = getLine(pA, p3);
        let line32 = getLine(p3, pB);

        //Delaunay三角形放入输出数组

        triangleV[t++] = getTriangle(pA, pB, p3);

        //Step4.	如果新生成的边 p1p3 不是约束边，若已经在堆栈中，
        //			则将其从中删除；否则，将其放入堆栈；类似地，可处理 p3p2 .
        let index: number;
        if (indexOfVector(line13, edgeV) < 0) {
            index = indexOfVector(line13, lineV);
            if (index > -1) {
                lineV.splice(index, 1);
            } else {
                lineV.push(line13);
            }
        }
        if (indexOfVector(line32, edgeV) < 0) {
            index = indexOfVector(line32, lineV);
            if (index > -1) {
                lineV.splice(index, 1);
            } else {
                lineV.push(line32);
            }
        }

        //Step5.	若堆栈不空，则从中取出一条边，转Step3；否则，算法停止 .
        //				trace("lineV.length:"+lineV.length);
        //				trace("处理结束edge###########\n");
    } while (lineV.length > 0)
    return triangleV;

}


function getLine(p1: Point, p2: Point) {
    return new Line().setPoints(p1, p2);
}


function getTriangle(p1: Point, p2: Point, p3: Point) {
    return new Triangle().setPoints(p1, p2, p3);
}