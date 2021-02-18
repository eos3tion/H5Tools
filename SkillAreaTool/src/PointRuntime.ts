export class PointRuntime {
    x: number;
    y: number;

    /**
     * 是否被屏蔽
     */
    disabled: boolean;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    get text() {
        return getPointText(this);
    }
}

export function getPointText(pt: Point) {
    return `[${pt.x},${pt.y}]`
}