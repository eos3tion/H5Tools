module junyou.game {

    /**
     * 资源显示用位图
     */
    export class ResourceBitmap extends egret.Bitmap implements IRecyclable, IDepth {
        public res: UnitResource;

        /**
         * z方向的坐标
         * 
         * @type {number}
         */
        public z: number = 0;

        public get depth(): number {
            return this.y + this.z;
        }

        public draw(drawInfo: IDrawInfo, now: number) {
            if (this.res) {
                this.res.draw(this, drawInfo, now);
            }
        }

        public recycle() {
            ResourceBitmap._pool.recycle(this);
        }

        public onRecycle() {
            recycleDisplay(this);
            this.res = null;
            this.z = 0;
            this.rotation = 0;
        }

        private static _pool: RecyclablePool<ResourceBitmap> = new RecyclablePool(ResourceBitmap);

        public static getInstance(): ResourceBitmap {
            return this._pool.getInstance();
        }
    }
}
