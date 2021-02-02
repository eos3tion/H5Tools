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
    TargetColor = "#330000",

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
    const halfGridSize = gridSize * .5;
    const { width, height } = canvas;
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
            setGrid(tx + centerX, ty + centerY, GridStyle.MainTargetColor);
            if (areas) {
                for (let i = 0; i < areas.length; i++) {
                    const { x, y } = areas[i];
                    if (x != tx || y != ty) {
                        setGrid(x + centerX, y + centerY, GridStyle.TargetColor);
                    }
                }
            }
        },

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

    function invalidate() {
        if (!_changed) {
            _changed = true;
            requestAnimationFrame(doRender);
        }
    }

    function doRender() {
        //中心点，永远绘制施法者
        setGrid(centerX, centerY, GridStyle.CasterColor);
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
        setGrid(centerX, centerY, GridStyle.CasterColor);
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
}

export type Grids = ReturnType<typeof getGrids>;