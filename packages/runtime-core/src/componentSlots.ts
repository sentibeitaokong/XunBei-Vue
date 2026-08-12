/**
 * @file 组件插槽（Slots）—— 内容分发机制
 *
 * 支持默认插槽和作用域插槽（通过函数传入 props）。
 */

import { ShapeFlags } from '@xunbei-vue/shared'

/**
 * 初始化组件实例的插槽。
 *
 * 只有当前 VNode 的 ShapeFlag 标记为 SLOT_CHILDREN 时才处理。
 *
 * @param instance - 组件实例
 * @param children - VNode 的 children
 */
export function initSlots(instance: any, children: any) {
  const { vnode } = instance
  if (vnode.ShapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

/**
 * 将 children 对象转换为标准插槽格式。
 *
 * 确保每个插槽的值是一个函数，函数返回的值为数组形式方便渲染。
 *
 * @param children - 原始 children 对象（key -> 渲染函数）
 * @param slots - 组件实例的 slots 属性（目标）
 */
function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key]
    slots[key] = (props: any) => normalizeSlotValue(value(props))
  }
}

/**
 * 将插槽渲染结果统一转换为数组格式。
 *
 * @param value - 插槽函数的返回值
 * @returns 数组
 */
function normalizeSlotValue(value: any) {
  return Array.isArray(value) ? value : [value]
}
