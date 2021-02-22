import { PointRuntime } from "./PointRuntime.js";
import { Rect } from "./Rect.js";
const enum GridStyle {
    AreaColor = "#0000ff",
    AreaAlpha = 0.5,

    AreaStrokeColor = AreaColor,
    AreaStrokeAlpha = 1,

    /**
     * 施法者颜色
     */
    CasterColor = "#00ff00",

    /**
     * 主目标颜色
     */
    MainTargetColor = "#ff0000",

    /**
     * 命中格位颜色
     */
    TargetColor = "#aa0000",

    /**
     * 正常格位颜色
     */
    NormalColor = "#aaaaaa",
}

interface GridOption {
    gridSize: number;
    cols?: number;
    rows?: number;
    padding?: number;
    color?: string;
}

class Grid {
    col: number;
    row: number;

    /**
     * 
     * @param col 列数
     * @param row 行数
     */
    setPos(col: number, row: number) {
        this.row = row;
        this.col = col;
    }

    /**
     * 要显示的颜色
     */
    color: string;
}

const noTarget = {} as Point;
const tempRect = new Rect;
const tempPt = { x: 0, y: 0 };

export function getGrids(opt: GridOption, canvas: HTMLCanvasElement) {
    const { gridSize, cols = 21, rows = 21, padding = 1, color = "#aaaaaa" } = opt;
    const size = gridSize;
    const width = cols * size;
    const height = rows * size;
    canvas.width = width;
    canvas.height = height;
    const halfGridSize = gridSize * .5;
    canvas.addEventListener("click", onClick);
    const cnt = canvas.getContext("2d");
    const gridWidth = gridSize;
    const gridHeight = gridSize;
    /**
     * 中心格子坐标X
     */
    const centerX = cols >> 1;
    /**
     * 中心格子坐标Y
     */
    const centerY = rows >> 1;
    const grids = [] as Grid[][];
    let _area: Path2D;
    let _target: PosArea;
    for (let y = 0; y < rows; y++) {
        let row = grids[y] = [];
        for (let x = 0; x < cols; x++) {
            let grid = new Grid;
            row[x] = grid;
            grid.setPos(x, y);
            grid.color = color;
        }
    }
    let _changed = false;
    return {
        getGridBounds,
        /**
         * 重置画布
         */
        reset,
        /**
         * 绘制主目标
         */
        setTarget(pos: PosArea) {
            let { target: { x: tx = 0, y: ty = 0 } = noTarget, areas } = pos;
            _target = pos;
            if (areas) {
                for (let i = 0; i < areas.length; i++) {
                    const { x, y } = areas[i];
                    if (x != tx || y != ty) {
                        setGrid(x + centerX, y + centerY, GridStyle.TargetColor);
                    }
                }
            }
        },
        invalidate,
        /**
         * 设置范围
         * @param area 
         */
        setAreaGraph(area: Path2D) {
            _area = area;
        },
        /**
         * 获取中心点像素坐标
         */
        getCenterPX() {
            tempPt.x = centerX * gridSize + halfGridSize;
            tempPt.y = centerY * gridSize + halfGridSize;
            return tempPt;
        },
        /**
         * 获取中心点格位坐标
         */
        getCenter() {
            tempPt.x = centerX;
            tempPt.y = centerY;
            return tempPt;
        }
    }

    function onClick(ev: MouseEvent) {
        //得到点击坐标，检查点击的当前格子
        //检查当前目标区域
        if (_target) {
            const { offsetX, offsetY } = ev;
            const { offsetWidth, offsetHeight } = canvas;
            const x = offsetX / offsetWidth * width;
            const y = offsetY / offsetHeight * height;
            let { x: rgx, y: rgy } = pixel2Grid(x, y);
            let gx = rgx - centerX;
            let gy = rgy - centerY;
            const areas = _target.areas;
            let find = false;
            let flag = false;
            //尝试重设当前区域中的值
            for (let i = 0; i < areas.length; i++) {
                const area = areas[i];
                if (area.x == gx && area.y == gy) {
                    flag = !area.disabled;
                    area.disabled = flag;
                    find = true;
                    break;
                }
            }
            if (!find) {
                areas.push(new PointRuntime(gx, gy));
            }
            setGrid(rgx, rgy, flag ? GridStyle.NormalColor : GridStyle.TargetColor);
            invalidate();
        }
    }

    function invalidate() {
        if (!_changed) {
            _changed = true;
            requestAnimationFrame(doRender);
        }
    }

    function doRender() {
        //中心点，永远绘制施法者
        cnt.clearRect(0, 0, width, height);
        cnt.save();
        cnt.lineWidth = padding;
        const padding2 = 2 * padding;
        //绘制格子
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let grid = getGrid(x, y);
                let rect = getGridBounds(x, y);
                let cx = rect.x;
                let cy = rect.y;
                cnt.fillStyle = grid.color;
                cnt.fillRect(cx + padding, cy + padding, gridWidth - padding2, gridHeight - padding2);
            }
        }
        cnt.restore();

        //绘制中心点
        cnt.save();
        cnt.fillStyle = GridStyle.CasterColor;
        let pt = grid2Pixel(centerX, centerY);
        cnt.beginPath();
        cnt.arc(pt.x, pt.y, halfGridSize, 0, Math.PI * 2);
        cnt.closePath();
        cnt.fill();
        cnt.restore();

        //绘制主目标
        if (_target) {
            cnt.save();
            cnt.fillStyle = GridStyle.MainTargetColor;
            const { target: { x: tx, y: ty } } = _target;
            let pt = grid2Pixel(centerX + tx, centerY + ty);
            cnt.beginPath();
            cnt.arc(pt.x, pt.y, halfGridSize, 0, Math.PI * 2);
            cnt.closePath();
            cnt.fill();
            cnt.restore();
        }

        //绘制选取范围
        if (_area) {
            cnt.save();
            //绘制边框
            cnt.globalAlpha = GridStyle.AreaStrokeAlpha;
            cnt.strokeStyle = GridStyle.AreaStrokeColor;
            cnt.lineWidth = 1;
            cnt.stroke(_area);

            cnt.globalAlpha = GridStyle.AreaAlpha;
            cnt.fillStyle = GridStyle.AreaColor;
            cnt.fill(_area);
            cnt.restore();
        }
        _changed = false;
    }

    /**
     * 绘制整个格位棋盘
     */
    function reset() {
        _area = undefined;
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                setGrid(x, y, color);
            }
        }
        invalidate();
    }


    function setGrid(x: number, y: number, color: string) {
        let grid = getGrid(x, y);
        if (grid) {
            if (color != grid.color) {
                grid.color = color;
                return true;
            }
        }
    }

    function getGrid(x: number, y: number) {
        return grids[y]?.[x];
    }

    function getGridBounds(x: number, y: number) {
        tempRect.x = x * gridSize;
        tempRect.y = y * gridSize;
        tempRect.width = gridSize;
        tempRect.height = gridSize;
        return tempRect;
    }

    function pixel2Grid(x: number, y: number) {
        return {
            x: x / gridSize >> 0,
            y: y / gridSize >> 0
        }
    }

    function grid2Pixel(x: number, y: number) {
        return {
            x: x * gridSize + halfGridSize,
            y: y * gridSize + halfGridSize
        }
    }
}

export type Grids = ReturnType<typeof getGrids>;