module junyou.game {
    /**
   * 资源管理器
   */
    export class ResourceManager {

        /**
         * 默认资源检测时间
         */
        static CHECK_TIME: number = 10000;

        /**
         * 默认销毁时间，1分钟之内资源没有被使用过，直接销毁
         */
        static DISPOSE_TIME: number = 60000;

        static resources: { [index: string]: IResource } = {};

        /**
         * 获取资源
         */
        static getResource(resID: string): IResource {
            return ResourceManager.resources[resID];
        }

        /**
         * 注册资源
         */
        static regResource(resID: string, res: IResource): boolean {
            var resources = ResourceManager.resources;
            if (resID in resources) {//资源id重复                
                return resources[resID] === res;
            }
            resources[resID] = res;
            return true;
        }

        //按时间检测资源
        static init() {
            let tobeDele: string[] = [];
            TimerUtil.addCallback(ResourceManager.CHECK_TIME, () => {
                let expire = Global.now - ResourceManager.DISPOSE_TIME;
                let reses = ResourceManager.resources;
                let i = 0;
                for (let key in reses) {
                    let res = <IResource>reses[key];
                    if (!res.isStatic && res.lastUseTime < expire) {
                        tobeDele[i++] = key;
                    }
                }
                for (let key of tobeDele) {
                    let res = <IResource>reses[key];
                    if (res) {
                        res.dispose();
                        RES.destroyRes(res.url);
                        delete reses[key];
                    }
                }
                tobeDele.length = 0;
            });
        }
    }
}