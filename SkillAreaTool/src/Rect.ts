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
     * 检查矩形的四个顶点，是否符合规范，返回符合范围的顶点数量
     * @param checker 
     */
    checkVertexs(checker: { (x: number, y: number): boolean }) {
        const { left, top, right, bottom } = this;
        let i = 0;
        checker(left, top) && i++;
        checker(right, top) && i++;
        checker(left, bottom) && i++;
        checker(right, bottom) && i++;
        return i;
    }

    /**
     * 检查范围内所有点
     * @param checker 
     * @param percent 超过此百分比，返回真
     */
    checkArea(checker: { (x: number, y: number): boolean }, percent: number) {
        const { left, top, right, bottom, width, height } = this;
        let i = 0;
        let count = width * height * percent;
        for (let x = left; x < right; x++) {
            for (let y = top; y < bottom; y++) {
                if (checker(x, y)) {
                    i++;
                }
            }
        }
        // console.log(left, top, width, height, i);
        return i >= count;
    }

    contains(x: number, y: number) {
        const { left, top, right, bottom } = this;
        return left <= x && right >= x && top <= y && bottom >= y;
    }
}