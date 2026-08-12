/**
 * @file 值转字符串展示 —— 模板插值表达式的最终渲染转换
 */

/**
 * 将任意值转换为字符串，用于模板中的插值显示。
 *
 * @param value - 要转换的值
 * @returns 转换后的字符串
 */
export function toDisplayString(value: any) {
  return String(value)
}
