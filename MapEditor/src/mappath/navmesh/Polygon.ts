import Point = egret.Point;
import Rectangle = egret.Rectangle;
import recyclable = jy.recyclable;
import { Line } from "./Line";
/**
 * r=multiply(sp,ep,op),得到(sp-op)*(ep-op)的叉积   
 * r>0:ep在矢量opsp的逆时针方向  
 * r=0：opspep三点共线  
 * r<0:ep在矢量opsp的顺时针方向  
 * @param sp 
 * @param ep 
 * @param op 
 */
function multiply(sp: Point, ep: Point, op: Point): Number {
    return (sp.x - op.x) * (ep.y - op.y) - (ep.x - op.x) * (sp.y - op.y);
}

/**
 * 获取包围盒
 * @param vertexV 
 */
function getAABB(vertexV: Point[], rect: Rectangle) {
    if (vertexV.length) {
        let { x, y } = vertexV[0];
        let lx = x;
        let rx = x;
        let ty = y;
        let by = y;

        for (let i = 1; i < vertexV.length; i++) {
            let v = vertexV[i];
            if (v.x < lx) {
                lx = v.x;
            }
            if (v.x > rx) {
                rx = v.x;
            }
            if (v.y < ty) {
                ty = v.y;
            }
            if (v.y > by) {
                by = v.y;
            }
        }
        rect.setTo(lx, rx - lx, ty, by - ty);
    } else {
        //将包围盒至到无限远处
        rect.setTo(Infinity, Infinity, 0, 0);
    }
}

let line0 = new Line;
let line1 = new Line;

function getNodeIndex(cv: Node[], node: Point) {
    for (let i = 0; i < cv.length; i++) {
        if (cv[i].v.equals(node)) {
            return i;
        }
    }
    return -1;
}

function intersectPoint(cv0: Node[], cv1: Node[]) {
    let insCnt = 0;		//交点数

    var startNode0: Node = cv0[0];
    var startNode1: Node;

    var hasIns: Boolean;
    while (startNode0 != null) {		//主多边形
        if (startNode0.next == null) {  //最后一个点，跟首点相连
            line0.setPoints(startNode0.v, cv0[0].v);
        } else {
            line0.setPoints(startNode0.v, startNode0.next.v);
        }

        startNode1 = cv1[0];
        hasIns = false;

        while (startNode1) {		//合并多边形
            if (!startNode1.next) {
                line1.setPoints(startNode1.v, cv1[0].v);
            } else {
                line1.setPoints(startNode1.v, startNode1.next.v);
            }
            let ins = jy.recyclable(Point);	//接受返回的交点
            //有交点
            if (line0.intersection(line1, ins) == LineClassification.SegmentsIntersect) {
                //忽略交点已在顶点列表中的
                if (getNodeIndex(cv0, ins) == -1) {
                    insCnt++;

                    ///////// 插入交点
                    let node0 = jy.recyclable(Node);
                    node0.set(ins, true, true);
                    var node1 = jy.recyclable(Node);
                    node1.set(ins, true, false);
                    cv0.push(node0);
                    cv1.push(node1);
                    //双向引用
                    node0.other = node1;
                    node1.other = node0;
                    //插入
                    node0.next = startNode0.next;
                    startNode0.next = node0;
                    node1.next = startNode1.next;
                    startNode1.next = node1;
                    //出点
                    if (line0.classifyPoint(line1.pB) == PointClassfication.RightSide) {
                        node0.o = true;
                        node1.o = true;
                    }
                    //TODO 线段重合
                    hasIns = true;		//有交点

                    //有交点，返回重新处理
                    break;
                }
            }
            startNode1 = startNode1.next;
        }
        //如果没有交点继续处理下一个边，否则重新处理该点与插入的交点所形成的线段
        if (hasIns == false) {
            startNode0 = startNode0.next;
        }
    }
    return insCnt;
}

function linkToPolygon(cv0: Node[], cv1: Node[]): Polygon[] {
    // console.log("linkToPolygon***linkToPolygon");
    //保存合并后的多边形数组
    let rtV = [] as Polygon[];

    //1. 选取任一没有被跟踪过的交点为始点，将其输出到结果多边形顶点表中．
    for (let i = 0; i < cv0.length; i++) {
        let testNode = cv0[i];

        if (testNode.i && !testNode.p) {
            //					trace("测试点0", testNode);
            let polygon = jy.recyclable(Polygon);
            let rcNodes = polygon.vertexV;
            while (testNode) {
                //						trace("测试点1", testNode);

                testNode.p = true;
                // 如果是交点
                if (testNode.i) {
                    testNode.other.p = true;

                    if (!testNode.o) {		//该交点为进点（跟踪裁剪多边形边界）
                        if (testNode.isMain) {		//当前点在主多边形中
                            testNode = testNode.other;		//切换到裁剪多边形中
                        }
                    } else {					//该交点为出点（跟踪主多边形边界）
                        if (!testNode.isMain) {		//当前点在裁剪多边形中
                            testNode = testNode.other;		//切换到主多边形中
                        }
                    }
                }

                rcNodes.push(testNode.v);  		////// 如果是多边形顶点，将其输出到结果多边形顶点表中

                if (!testNode.next) {	//末尾点返回到开始点
                    if (testNode.isMain) {
                        testNode = cv0[0];
                    } else {
                        testNode = cv1[0];
                    }
                } else {
                    testNode = testNode.next;
                }

                //与首点相同，生成一个多边形
                if (testNode.v.equals(rcNodes[0])) break;
            }

            //提取
            rtV.push(polygon);
        }
    }

    // trace("rtV", rtV);
    return rtV;
}

export class Polygon {

    /**
     * 顶点列表
     */
    vertexV = [] as Point[];

    private bounds = new egret.Rectangle();

    private calcedBounds: boolean;

    private calcedCW: boolean;

    private _isCW: boolean;

    add(vertex: Point) {
        this.vertexV.push(vertex);
        this.calcedCW = false;
        this.calcedBounds = false;
    }

    /**
     * 获取包围盒
     */
    getAABB() {
        let bounds = this.bounds;
        if (!this.calcedBounds) {
            getAABB(this.vertexV, bounds);
            this.calcedBounds = true;
        }
        return bounds;
    }

    /**
     * 将顶点变为顺时针
     */
    cw() {
        if (!this.isCW()) {
            this.vertexV.reverse();
        }
    }

    /**
     * 检查顶点顺序是否为顺时针
     * 
     */
    isCW() {
        let cw = this._isCW;
        if (!this.calcedCW) {
            //最上（y最小）最左（x最小）点， 肯定是一个凸点
            //寻找最上点
            const vertexV = this.vertexV;
            let topPt = vertexV[0];
            let topPtId = 0;	//点的索引
            for (let i = 1; i < vertexV.length; i++) {
                const cur = vertexV[i];
                if (topPt.y > cur.y || (topPt.y == cur.y && topPt.x > cur.x)) {
                    topPt = cur;
                    topPtId = i;
                }
            }

            //凸点的邻点
            let lastId = topPtId - 1 >= 0 ? topPtId - 1 : vertexV.length - 1;
            let nextId = topPtId + 1 >= vertexV.length ? 0 : topPtId + 1;
            let last = vertexV[lastId];
            let next = vertexV[nextId];
            this._isCW = cw = multiply(last, next, topPt) < 0;
            this.calcedCW = true;
        }
        return cw;
    }

    union(polygon: Polygon) {
        if (!this.getAABB().intersects(polygon.getAABB())) {
            return
        }
        let cv0 = [] as jy.Recyclable<Node>[];
        let cv1 = [] as jy.Recyclable<Node>[];
        setNodes(this.vertexV, cv0, true);
        setNodes(polygon.vertexV, cv1, false);
        let insCnt = intersectPoint(cv0, cv1);
        if (insCnt > 0) {
            return linkToPolygon(cv0, cv1);
        }

        function setNodes(vertexV: Point[], cv0: jy.Recyclable<Node>[], isMain: boolean) {
            let i = 0;
            for (; i < vertexV.length; i++) {
                let node = jy.recyclable(Node);
                node.set(vertexV[i], false, isMain);
                if (i > 0) {
                    cv0[i - 1].next = node;
                }
                cv0[i] = node;
            }
            cv0.length = i;
        }
    }

    onRecycle() {
        this.vertexV.length = 0;
    }
}

class Node {
    /**
     * 坐标点
     */
    v = null as Point;
    /**
     * 是否是交点
     */
    i = false;
    /**
     * 是否处理过
     */
    p = false;

    /**
     * false 进点  
     * true 出点
     */
    o = false;

    /**
     * 交点的双向引用
     */
    other = null as Node

    /**
     * 点是否在主多边形中
     */
    isMain = false;

    /**
     * 多边形的下一个点
     */
    next = null as Node;

    set(pt: Point, isInters: boolean, isMain: boolean) {
        this.v = pt;
        this.i = isInters;
        this.isMain = isMain;
        return this;
    }
    toString(): String {
        return this.v.toString() + "-->交点：" + this.i + "出点：" + this.o + "主：" + this.isMain + "处理：" + this.p;
    }

}