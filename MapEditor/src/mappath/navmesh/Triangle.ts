import Point = egret.Point;
import { Line } from "./Line";
export class Triangle {

    points = [new Point, new Point, new Point] as Readonly<Point>[];

    protected sides = [new Line, new Line, new Line];

    center = new Point as Readonly<Point>;
    /**
     * 数据是否计算过
     */
    protected _calced: boolean;


    setPoints(p1: Point, p2: Point, p3: Point) {
        const [pA, pB, pC] = this.points;
        pA.copyFrom(p1);
        pB.copyFrom(p2);
        pC.copyFrom(p3);
        this._calced = false;
    }

    calculateData() {
        if (!this._calced) {
            const { points: [pA, pB, pC], center } = this;
            center.setTo(
                (pA.x + pB.x + pC.x) / 3,
                (pA.y + pB.y + pC.y) / 3
            )
            const sides = this.sides;
            sides[TrangleSideIndex.SideAB].setPoints(pA, pB); // line AB
            sides[TrangleSideIndex.SideBC].setPoints(pB, pC); // line BC
            sides[TrangleSideIndex.SideCA].setPoints(pC, pA); // line CA
            this._calced = true;
        }
    }

    /**
     * 检查点是否在三角形中间
     * @param testPoint 
     */
    isPointIn(testPoint: Point) {
        this.calculateData();
        // 点在所有边的右面或者线上
        return this.sides.every(
            side =>
                side.classifyPoint(testPoint, Const.Epsilon) != PointClassfication.LeftSide
        );
    }
}