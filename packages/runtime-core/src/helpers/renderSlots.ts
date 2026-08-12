/**
 * @file 插槽渲染辅助函数
 *
 * 将组件插槽渲染为 Fragment 类型的 VNode。
 */

import { createVNode, Fragement } from '../vnode.ts'

/**
 * 渲染指定名称的插槽。
 *
 * 如果插槽是函数（作用域插槽），则传入 props 调用后渲染。
 * 所有插槽内容都会被包裹在 Fragment 中便于统一处理。
 *
 * @param slots - 组件实例的 slots 对象
 * @param name - 插槽名称（default 为默认插槽）
 * @param props - 作用域插槽的 props 参数
 * @returns Fragment 类型的 VNode
 */
export function renderSlots(slots: any, name: any, props: any) {
  const slot = slots[name]
  if (slot) {
    // 当 slot 是函数时说明是作用域插槽
    if (typeof slot === 'function') {
      // Fragment 类型：默认渲染 children
      return createVNode(Fragement, {}, slot(props))
    }
  }
}
