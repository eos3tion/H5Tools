import { GridableMapInfo, GridablePath } from "../GridAblePath";
interface MapInfo extends GridableMapInfo {

}


export class StaggeredMapPath extends GridablePath<MapInfo> {
    readonly name = "等角（交错）路径";

    initMapSize(map: MapInfo) {
        let { width, height, gridWidth, gridHeight } = map;
        let hh = gridHeight >> 1;
        let columns = Math.ceil(width / gridWidth);
        let rows = Math.ceil(height / hh);
        map.columns = columns;
        map.rows = rows;
    }
}
