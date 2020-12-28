declare namespace TieldMap {
    type Orientation = "orthogonal" | "isometric" | "staggered" | "hexagonal";
    type RenderOrder = "right-down" | "right-up" | "left-down" | "left-up";
    interface Map {
        /**
         * Hex-formatted color (#RRGGBB or #AARRGGBB)
         */
        backgroundcolor?: string;
        /**
         * The compression level to use for tile layer data (defaults to -1, which means to use the algorithm default)
         */
        compressionlevel: number;
        editorsettings: Editorsettings;
        /**
         * 地图宽度
         */
        width: number;
        /**
         * 地图高度
         */
        height: number;
        infinite: boolean;
        layers: Layer[];
        nextlayerid: number;
        nextobjectid: number;
        orientation: Orientation;
        /**
         * right-down (the default), right-up, left-down or left-up (currently only supported for orthogonal maps)
         */
        renderorder: RenderOrder;
        /**
         * x or y (staggered / hexagonal maps only)  
         * 哪个轴向半径会变短
         */
        staggeraxis: "x" | "y";
        /**
         * odd 第一行（奇数）开始顶格  
         * even 第二行（偶数）开始顶格
         */
        staggerindex: "odd" | "even";
        tiledversion: string;
        /**
         * 格子高度
         */
        tileheight: number;
        /**
         * 格子宽度
         */
        tilewidth: number;
        tilesets: Tileset[];
        type: string;
        version: number;
    }

    interface Editorsettings {
        export: Export;
    }

    interface Export {
        format: string;
        target: string;
    }

    interface Layer {
        data: number[];
        height: number;
        id: number;
        name: string;
        opacity: number;
        type: string;
        visible: boolean;
        width: number;
        x: number;
        y: number;
    }

    /**
     * 图集配置
     */
    interface Tileset {
        columns: number;
        /**
         * 集合中，第一个 tile 的 id
         */
        firstgid: number;
        grid?: Grid;
        /**
         * 图片相对路径
         */
        image: string;
        /**
         * 图片总高度
         */
        imageheight: number;
        /**
         * 图片总宽度
         */
        imagewidth: number;
        /**
         * 图片边框和第一个tile 间距 (pixels)
         */
        margin: number;
        /**
         * 图集名称
         */
        name: string;
        /**
         * tile直接的间隔 (pixels)
         */
        spacing: number;
        terrains?: Terrain[];
        tilecount: number;
        tileheight: number;
        /**
         * Buffer between image edge and first tile (pixels)
         */
        tiles?: Tile[];
        properties?: Property[];
        tilewidth: number;
        tileoffset?: Tileoffset;

    }

    interface Grid {
        height: number;
        orientation: "orthogonal" | "isometric";
        width: number;
    }

    interface Terrain {
        name: string;
        /**
         * id
         */
        tile: number;
    }

    interface Tileoffset {
        x: number;
        y: number;
    }

    interface Tile {
        id: number;
        /**
         *  top-left, top-right, bottom-left, bottom-right
         */
        terrain: [number, number, number, number];

        properties: Property[];

    }

    export interface Property {
        name: string;
        type: string;
        value: boolean;
    }
}


