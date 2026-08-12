/**
 * @file 组件 Props 初始化
 */

/**
 * 初始化组件实例的 props 属性。
 *
 * @param instance - 组件实例
 * @param rawProps - 原始 props 数据
 */
export function initProps(instance: any, rawProps: any) {
  instance.props = rawProps || {}
}
