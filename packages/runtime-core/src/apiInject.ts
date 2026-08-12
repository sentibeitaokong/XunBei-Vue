/**
 * @file 依赖注入（provide / inject）—— 跨层级组件通信
 *
 * provide 用于在祖先组件中提供数据，inject 用于在后代组件中获取数据。
 * 基于原型链查找，如果当前组件没有 provide，会自动向上查找父级的 provides。
 */

import { getCurrentInstance } from './component.ts'

/**
 * 注入数据 —— 在后代组件中获取祖先组件通过 provide 提供的数据。
 *
 * 查找顺序：优先从父级 provides 中查找 key，
 * 如果没有找到则返回 defaultValue。
 *
 * @param key - 注入的 key
 * @param defaultValue - 默认值（可以是值或工厂函数）
 * @returns 注入的值或默认值
 */
export function inject(key: any, defaultValue?: any) {
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides
    if (key in parentProvides) {
      return parentProvides[key]
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
}

/**
 * 提供数据 —— 在祖先组件中提供数据供后代组件 inject。
 *
 * 使用原型链继承父级 provides，当前组件对 provides 的修改不会影响父级。
 *
 * @param key - 提供的 key
 * @param value - 提供的值
 */
export function provide(key: any, value: any) {
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent.provides
    // 当前 provides 等于父节点 provides 时说明是刚初始化，
    // provides 优先取当前的，取不到就取父节点的（原型链继承），
    // 该操作仅在组件初始化时执行
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}
