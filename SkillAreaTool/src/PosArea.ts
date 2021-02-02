import { getPointText } from "./PointRuntime.js";

export class PosAreaRuntime implements PosArea {
    target: Point;
    areas: Point[] = [];

    constructor(target?: Point) {
        this.target = target;
    }

    get text() {
        let target = this.target;
        return target && getPointText(target);
    }
}