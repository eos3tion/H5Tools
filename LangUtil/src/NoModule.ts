/**
 * 无模块前缀
 */
const NoModulePrefix = "@__@";
/**
 * 无模块的正则
 */
const NoModuleReg = /@__@\d+/;
var seed = 0;

/**
 * 获取没有模块名称的标识
 * 
 * @returns 
 */
function getNoModuleKey() {
    return NoModulePrefix + (seed++);
}

/**
 * 判断一个模块是否为没有模块的标识
 * 
 * @param {string} key 
 * @returns 
 */
function isNoModule(key: string) {
    return NoModuleReg.test(key);
}

export default {
    getNoModuleKey,
    isNoModule
}