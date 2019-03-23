module junyou.game {

    export class BaseResource extends egret.Bitmap implements IResource {
        /**
         * 最后使用的时间戳
         */
        lastUseTime: number;
        /**
         * 资源id
         */
        resID: string;

        /**
         * 资源最终路径
         */
        url: string;

        load() {
            RES.getResByUrl(this.url, this.loadComplete, this, RES.ResourceItem.TYPE_IMAGE);
        }

        /**
         * 资源加载完成
         */
        loadComplete(res: egret.Texture, key: string) {
            if (key == this.url) {
                this.texture = res;
            }
        }

        dispose() {
            if (this.texture) {
                this.texture.dispose();
            }
        }
    }
}