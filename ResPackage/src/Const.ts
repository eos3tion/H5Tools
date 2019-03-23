const enum Mode {
    Pak = 0,
    Ani = 1
}

const enum PromiseControlState {
    /**
     * Promise被外部终止
     */
    ExternalStop = 2900000,
}

interface PromiseControl {
    /**
     * 是否停止promise，如果停止，则抛出错误
     * 
     * @type {boolean}
     * @memberOf PromiseControl
     */
    stop?: boolean;
}
//现代浏览器内置$和$$，在此处理是用于代码提示
var $ = document.querySelector;
var $$ = document.querySelectorAll;