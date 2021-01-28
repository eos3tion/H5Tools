const tmpPoint = { x: 0, y: 0 }

export class Rect {
    x: number;
    y: number;
    width: number;
    height: number;

    get left() {
        return this.x;
    }
    get right() {
        return this.x + this.width;
    }

    get top() {
        return this.y;
    }
    get bottom() {
        return this.y + this.height;
    }

    /**
     * 左上的点
     */
    get tl(): Readonly<Point> {
        tmpPoint.x = this.left;
        tmpPoint.y = this.top;
        return tmpPoint;
    }

    /**
     * 右上的点
     */
    get tr(): Readonly<Point> {
        tmpPoint.x = this.right;
        tmpPoint.y = this.top;
        return tmpPoint;
    }

    /**
     * 左下的点
     */
    get bl(): Readonly<Point> {
        tmpPoint.x = this.left;
        tmpPoint.y = this.bottom;
        return tmpPoint;
    }

    /**
     * 右下的点
     */
    get br(): Readonly<Point> {
        tmpPoint.x = this.right;
        tmpPoint.y = this.bottom;
        return tmpPoint;
    }

    contains(x: number, y: number) {
        const { left, top, right, bottom } = this;
        return left <= x && right >= x && top <= y && bottom >= y;
    }
}