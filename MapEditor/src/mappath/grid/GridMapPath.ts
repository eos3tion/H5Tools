import { GridableMapInfo, GridablePath } from "../GridAblePath";
interface MapInfo extends GridableMapInfo {

}


export class GridMapPath extends GridablePath<MapInfo> {

    readonly name = "格子路径";

    initMapSize(map: MapInfo) {
        let { width, height, gridWidth, gridHeight } = map;
        let columns = Math.ceil(width / gridWidth);
        let rows = Math.ceil(height / gridHeight);
        map.columns = columns;
        map.rows = rows;
    }

}

