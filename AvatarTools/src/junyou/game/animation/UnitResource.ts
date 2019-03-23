/**
 * @author 3tion
 */
module junyou.game {

    /**
     * 从数据中获取纹理
     */
    function getTextureFromImageData(data): JTexture {
        var texture = new JTexture();
        var sx: number = data[0];
        var sy: number = data[1];
        texture.tx = data[2] || 0;
        texture.ty = data[3] || 0;
        var width: number = data[4];
        var height: number = data[5];
        texture.$initData(sx, sy, width, height, 0, 0, width, height, width, height);
        return texture;
    }


	/**
	 * 单位资源<br/>
	 * 图片按动作或者方向的序列帧，装箱处理后的图片位图资源<br/>
	 * 以及图片的坐标信息
	 */
    export class UnitResource {


        /**
         * 单配置文件的路径
         */
        public static DATA_JSON: string = "d.json";

        /**
         * 资源标识
         */
        key: string;

        url: string;

        private _splitInfo: SplitInfo;

        state: RequestState = RequestState.UNREQUEST;

        /**
         * 获取数据
         */
        private _datas: { [index: number]: JTexture[][] };

        constructor(uri: string, splitInfo: SplitInfo) {
            this.key = uri;
            this._splitInfo = splitInfo;
        }

        /**
         * 解析数据
         */
        public decodeData(data: {}) {
            var _datas: { [index: number]: JTexture[][] } = {};
            for (let action in data) {
                let dData: JTexture[][] = [];
                _datas[action] = dData;
                let actData = data[action];
                for (let d = 0, len = actData.length; d < len; d++) {
                    let fData: JTexture[] = [];
                    dData[d] = fData;
                    let dirData: any[] = actData[d];
                    for (let f = 0, flen = dirData.length; f < flen; f++) {
                        if (dirData[f] !== 0) {
                            fData[f] = getTextureFromImageData(dirData[f]);
                        }
                    }
                }
            }
            this._datas = _datas;
            this.state = RequestState.COMPLETE;
        }

        /**
         * 加载数据
         */
        public loadData() {
            if (this.state == RequestState.UNREQUEST) {
                var uri: string = this.key + "/" + UnitResource.DATA_JSON;
                var url = ConfigUtils.getResUrl(uri, true);
                this.url = url;
                this.state = RequestState.REQUESTING;
                RES.getResByUrl(url, this.dataLoadComplete, this, RES.ResourceItem.TYPE_JSON);
            }
        }

        /**
         * 资源加载完成
         */
        dataLoadComplete(data: Object, key: string) {
            if (key == this.url) {
                this.decodeData(data);
            }
        }

        /**
         * 将资源渲染到位图容器中
         */
        draw(bitmap: egret.Bitmap, drawInfo: IDrawInfo, now: number) {
            if (!this._datas) {
                return;
            }
            var d = drawInfo.d, f = drawInfo.f, a = drawInfo.a;
            var dDatas: JTexture[][] = this._datas[a];
            if (dDatas) {
                let frames: JTexture[] = dDatas[d];
                if (frames) {
                    var frame: JTexture = frames[f];
                    if (frame) {
                        let r = this._splitInfo.getResource(d, a);
                        let uri = this.key + "/" + r + Extension.PNG;
                        let res: SplitUnitResource = <SplitUnitResource>ResourceManager.getResource(uri)
                        if (!res) {
                            return;
                        }
                        if (!res.textures.length) {
                            res.bindTextures(this._datas, this._splitInfo.adDict[r]);
                        }
                        res.lastUseTime = now;
                        bitmap.texture = frame;
                        bitmap.anchorOffsetX = frame.tx;
                        bitmap.anchorOffsetY = frame.ty;
                    }
                }
            }
            //TODO 绘制未加载的代理图片
        }

    }
}
