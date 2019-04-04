declare const enum NavMeshConst {
    /**
     * 精度
     */
    Epsilon = 1e-6,

}

declare const enum TrangleSideIndex {
    SideAB = 0,
    SideBC = 1,
    SideCA = 2
}

/**
 * 点所在的位置
 */
declare const enum PointClassification {
    /**
     * 点离在线上，或者离得非常非常近（低于精度）
     */
    OnLine = 0,
    /**
     * 按端点A->端点B，点在线的左边
     */
    LeftSide = 1,
    /**
     * 按端点A->端点B，点在线的右边
     */
    RightSide = 2
}

declare const enum LineClassification {
    /**
     * 共线
     */
    Collinear = 0,
    /**
     * 直线相交，但线段不相交
     */
    LinesIntersect = 1,
    /**
     * 两条线段相互平分
     */
    SegmentsIntersect = 2,

    ABisectB = 3,

    BBisectA = 4,
    /**
     * 平行
     */
    Paralell = 5

}