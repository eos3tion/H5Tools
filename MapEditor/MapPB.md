## 地图信息
```protobuf
message MapInfoPB {
   required int32 id=1;//地图唯一标识
   required int32 extType=2;//扩展名存储类型
   required int32 type=3;//地图类型 `0` GridMapInfo `1` NavMeshMapInfo
   required int32 width=4;//地图宽度
   required int32 height=5;//地图高度
   required bytes data=6;//特殊地图数据，根据`type`不同，里面数据不同
   repeated MapEffPB effs=7;//效果列表
   repeated MapLinePB lines=8;//带标识的导航线/多边形信息
   repeated MapOvalPB ovals=9;//带标识的椭圆区域
   optional int32 pWidth=10;//单张底图宽度
   optional int32 pHeight=11;//单张底图高度，当没有此值时，和pWidth一致  
   optional bytes noPic=12;//没有地图数据的数据索引
   optional TiledMapPB tiledMap=13;//tiled生成的地图数据
   repeated SubPathPB subPaths=14;//子路径数据
}

message MapPointPB {
   required int32 x=1;//坐标 x
   required int32 y=2;//坐标 y
}

message MapLinePB {
   required int32 id=1;//线的标识  
   repeated MapPointPB points=2;//线上的点
   optional bool flag=3;//是否为封闭的区域，即最后一个点，是否会和第一个点连上
   optional int32 type=4;//默认为直线，后续用于支持曲线（可能使用赫米特差值算法补差值,或者直接当特定点为贝塞尔的控制点）
}

message MapOvalPB {
   required int32 id=1;//椭圆的标识
   optional int32 a=2;//横轴长度，如果没有横轴长度，则表示只是一个有标识的点
   optional int32 b=3;//纵轴长度，没有此值则代表圆形，`a`则为圆形直径
   required MapPointPB center=4;//中心点坐标
}

message MapEffPB {
   required string uri=1;//资源路径
   required int32 layer=2;//层级标识
   required sint32 x=3;//坐标x
   required sint32 y=4;//坐标y
   required sint32 scaleX=5;//缩放X的100倍
   required sint32 scaleY=6;//缩放Y的100倍
   optional int32 duration=7;//移动效果的持续时间参数
   optional sint32 speedX=8;//x方向的移动速度
   optional sint32 speedY=9;//y方向的移动速度
   optional int32 seed=10;//用于同步移动的时间种子
   optional sint32 rotation=11;//旋转
   optional string group=12;//分组名称
   optional int32 type=13;//类型，0或者没有为ani <br>1 龙骨
}

message GridMapInfoPB {
   required int32 columns=1;//格子列数
   required int32 rows=2;//格子行数
   required int32 gridWidth=3;//格子宽度
   required int32 gridHeight=4;//格子高度
   optional bytes pathdata=5;//格子是否可走的数据
   optional bytes alphadata=6;//格子透明度数据
   optional int32 pdatabit=7;//格子中路径占用的位数(1bit,2bit,4bit,8bit)
   repeated PointGroupPB points=8;//点集数据
}

message PointGroupPB {
   required string id=1;//点集标识
   repeated MapPointPB points=2;//有序点集
}

message PolyPointIdxPB {
   repeated int32 idxs=1;//点的索引集合
}

message TPointIdxPB {
   required int32 a=1;//点A索引
   required int32 b=2;//点B索引
   required int32 c=3;//点C索引
}

message MaskPolyPB {
   repeated MapPointPB points=1;//多边形的点集
   optional int32 data=2;//如果alpha数据(0-100)，100代表不透明，0代表完全透明
}

message NavMeshMapInfoPB {
   repeated MapPointPB points=1;//所有的点数据
   repeated TPointIdxPB trians=2;//所有三角形对应点的索引数据
   repeated PolyPointIdxPB polys=3;//不可走区域的三角形数据
   repeated MaskPolyPB masks=4;//透明/遮罩区域对应的数据
}

message TiledMapPB {
   required int32 cols=1;//总列数
   required int32 rows=2;//总行数
   required int32 tileWidth=3;
   required int32 tileHeight=4;
   repeated bytes layers=5;//每一层的tile的id的字节数组，一个字节为一个tile的id
}


message SubPathPB {
   required string id=1;//子路径数据标识
   required int32 type=3;//地图类型 `0` GridMapInfo `1` NavMeshMapInfo `2` StaggerdMapInfo
   required bytes data=6;//特殊地图数据，根据`type`不同，里面数据不同
}
```