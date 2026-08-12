/**
 * @file 共享工具模块 —— 提供框架各包通用的工具函数与常量
 *
 * 包含对象操作、类型判断、字符串处理等基础工具。
 */

/** 浅合并对象，等价于 Object.assign */
export const extend = Object.assign

/** 冻结的空对象，用于默认值避免不必要的对象创建 */
export const EMPTY_OBJ = {}

export * from './toDisplayString.ts'
export * from './ShapeFlags.ts'

/**
 * 判断一个值是否为对象（排除 null）。
 *
 * @param value - 要检查的值
 * @returns 如果是非 null 的对象则返回 true
 */
export const isObject = (value: any) => {
  return value !== null && typeof value === 'object'
}

/** 判断是否为数组，等价于 Array.isArray */
export const isArray = Array.isArray

/**
 * 判断一个值是否为字符串类型。
 *
 * @param value - 要检查的值
 * @returns 如果是 string 类型则返回 true
 */
export const isString = (value: string) => typeof value === 'string'

/**
 * 使用 Object.is 比较两个值是否发生了变化。
 *
 * @param val - 旧值
 * @param newVal - 新值
 * @returns 如果值不相等则返回 true
 */
export const hasChanged = (val: any, newVal: any): boolean => {
  return !Object.is(val, newVal)
}

/**
 * 判断对象自身是否拥有指定的属性。
 *
 * @param val - 目标对象
 * @param key - 属性名
 * @returns 如果对象自身拥有该属性则返回 true
 */
export const hasOwn = (val: any, key: any) =>
  Object.prototype.hasOwnProperty.call(val, key)

/**
 * 首字母大写。
 *
 * 用于事件名转换，例如将 add 转换为 Add。
 *
 * @param str - 输入字符串
 * @returns 首字母大写后的字符串
 */
export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 为事件名添加 "on" 前缀并转换为驼峰大写形式。
 *
 * 例如：add -> onAdd，add-foo -> onAddFoo
 *
 * @param str - 事件名
 * @returns 处理后的 handler key 名称
 */
export const toHandleKey = (str: string) => {
  return str ? 'on' + capitalize(str) : ''
}

/**
 * 将连字符分隔的字符串转换为驼峰命名。
 *
 * 例如：add-foo -> addFoo
 *
 * @param str - 连字符分隔的字符串
 * @returns 驼峰命名的字符串
 */
export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_: string, c: any) => {
    return c ? c.toUpperCase() : ''
  })
}
