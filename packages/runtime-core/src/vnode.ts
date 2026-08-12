/**
 * @file 虚拟节点（VNode）—— 虚拟 DOM 的核心数据结构
 *
 * VNode 是框架内部用来描述 DOM 结构的数据对象，
 * 通过 ShapeFlag 位运算标记节点类型与子节点形态。
 */

import { ShapeFlags } from '@xunbei-vue/shared'

/** Fragment 类型标识 —— 用于渲染多根节点或插槽 */
export const Fragement = Symbol('Fragement')
/** Text 类型标识 —— 用于渲染纯文本节点 */
export const Text = Symbol('Text')

/** createElementVNode 别名 */
export { createVNode as createElementVNode }

/**
 * VNode 接口 —— 虚拟 DOM 节点的数据结构。
 */
export interface VNode {
  /** 是否为 VNode 的标记 */
  __v_isVNode: boolean
  /** diff 算法的比对 key */
  key: any
  /** 元素标签名或组件 */
  type: any
  /** 属性 / props */
  props: any
  /** 子节点 */
  children: any
  /** 节点类型标识（ShapeFlag 位掩码） */
  ShapeFlag: number
  /** 对应的组件实例 */
  component: null
  /** 对应的真实 DOM 元素 */
  el: null
}

/**
 * 判断一个值是否为 VNode。
 *
 * @param value - 要检查的值
 * @returns 类型收窄 —— 如果是 VNode 则返回 true
 */
export function isVNode(value: any): value is VNode {
  return value ? value.__v_isVNode === true : false
}

/**
 * 创建一个虚拟 DOM 节点（VNode）。
 *
 * @param type - 标签名（string）或组件对象
 * @param props - 节点属性，key 会从 props.key 中提取
 * @param children - 子节点，可以是 string、数组或 VNode
 * @returns VNode 实例
 */
export function createVNode(type: any, props?: any, children?: any): VNode {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props && props.key,
    ShapeFlag: getShapeFlag(type),
    component: null,
    el: null,
  }
  // 位运算 a | b：同时满足 a 和 b 两种条件
  if (typeof children === 'string') {
    // children 是 string 类型 -> element 节点
    vnode.ShapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    // children 是数组 -> 组件或嵌套子节点
    vnode.ShapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 判断是否是插槽：组件 + children 是 object
  if (vnode.ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      // 设置标识为插槽
      vnode.ShapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }
  return vnode
}

/**
 * 创建一个文本类型的 VNode。
 *
 * @param text - 文本内容
 * @returns 文本 VNode
 */
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

/**
 * 根据 type 类型获取初始 ShapeFlag。
 *
 * @param type - VNode 的 type 属性
 * @returns string 类型返回 ELEMENT，否则返回 STATEFUL_COMPONENT
 */
function getShapeFlag(type: any) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
