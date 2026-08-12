/**
 * @file 运行时辅助函数标识 —— 编译器与运行时的桥梁
 *
 * 使用 Symbol 唯一标识需要在运行时代码中导入的函数。
 * helperMapName 将 Symbol 映射为实际的函数名字符串。
 */

/** toDisplayString 辅助函数 —— 用于插值表达式的值转字符串 */
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
/** createElementVNode 辅助函数 —— 用于创建元素 VNode */
export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')

/** Symbol -> 函数名字符串 的映射表 */
export const helperMapName = {
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
}
