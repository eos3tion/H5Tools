import { Triangle } from "../geom/Triangle";
import Point = egret.Point;
const distance = Point.distance;

function getMidPoint(midPoint: Point, pA: Point, pB: Point) {
    midPoint.setTo((pA.x + pB.x) / 2, (pA.y + pB.y) / 2);
    return midPoint;
}

/**
  * 获得两个点的相邻的三角形
  * @param pA 
  * @param pB 
  * @param caller true 如果提供的两个点是caller的一个边
  */
function requestLink(pA: Point, pB: Point, caller: Cell, target: Cell) {
    const { pA: pointA, pB: pointB, pC: pointC } = target;
    const links = target.links;
    let index = caller.index;
    if (pointA.equals(pA)) {
        if (pointB.equals(pB)) {
            links[TrangleSideIndex.SideAB] = index;
            return true;
        } else if (pointC.equals(pB)) {
            links[TrangleSideIndex.SideCA] = index;
            return true;
        }
    } else if (pointB.equals(pA)) {
        if (pointA.equals(pB)) {
            links[TrangleSideIndex.SideAB] = index;
            return true;
        } else if (pointC.equals(pB)) {
            links[TrangleSideIndex.SideBC] = index;
            return true;
        }
    } else if (pointC.equals(pA)) {
        if (pointA.equals(pB)) {
            links[TrangleSideIndex.SideCA] = index;
            return true;
        } else if (pointB.equals(pB)) {
            links[TrangleSideIndex.SideBC] = index;
            return true;
        }
    }
}


export class Cell extends Triangle {

    index: number;

    links = [-1, -1, -1] as { [idx in TrangleSideIndex]: number };

    /**
     * 每边的中点
     */
    m_WallMidpoint = [new Point, new Point, new Point] as { [idx in TrangleSideIndex]: Point };

    m_WallDistance = [0, 0, 0];

    m_ArrivalWall = -1;
    h: number;

    init() {
        this.calculateData();
        const { m_WallMidpoint, m_WallDistance, pA, pB, pC } = this;
        let mAB = getMidPoint(m_WallMidpoint[TrangleSideIndex.SideAB], pA, pB);
        let mBC = getMidPoint(m_WallMidpoint[TrangleSideIndex.SideBC], pB, pC);
        let mCA = getMidPoint(m_WallMidpoint[TrangleSideIndex.SideCA], pC, pA);

        m_WallDistance[0] = distance(mAB, mBC);
        m_WallDistance[1] = distance(mCA, mBC);
        m_WallDistance[2] = distance(mAB, mCA);
    }

    /**
     * 检查并设置当前三角型与`cellB`的连接关系（方法会同时设置`cellB`与该三角型的连接）
     * @param cellB 
     */
    checkAndLink(cellB: Cell): void {
        const { pA, pB, pC, links } = this;
        let idx = cellB.index;
        if (links[TrangleSideIndex.SideAB] == -1 && requestLink(pA, pB, this, cellB)) {
            links[TrangleSideIndex.SideAB] = idx;
        } else if (links[TrangleSideIndex.SideBC] == -1 && requestLink(pB, pC, this, cellB)) {
            links[TrangleSideIndex.SideBC] = idx;
        } else if (links[TrangleSideIndex.SideCA] == -1 && requestLink(pC, pA, this, cellB)) {
            links[TrangleSideIndex.SideBC] = idx;
        }
    }
    /**
     * 记录路径从上一个节点进入该节点的边（如果从终点开始寻路即为穿出边）
     * @param index	路径上一个节点的索引
     */
    setAndGetArrivalWall(index: number) {
        let m_ArrivalWall = -1;
        const links = this.links;
        if (index == links[0]) {
            m_ArrivalWall = 0;
        } else if (index == links[1]) {
            m_ArrivalWall = 1;
        } else if (index == links[2]) {
            m_ArrivalWall = 2;
        }
        if (m_ArrivalWall != -1) {
            this.m_ArrivalWall = m_ArrivalWall;
        }
        return m_ArrivalWall;
    }

    calcH(goal: Point) {
        let { x, y } = this.center;
        let dx = Math.abs(goal.x - x);
        let dy = Math.abs(goal.y - y);
        this.h = dx + dy;
    }

}

export function getCell(triangle: Triangle) {
    let cell = Object.setPrototypeOf(triangle, Cell.prototype) as Cell;
    cell.init();
    return cell;
}