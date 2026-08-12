/**
 * @file AST（抽象语法树）节点类型与工具
 *
 * 定义了模板编译过程中所有节点类型的枚举，
 * 以及创建 VNode 调用节点的辅助函数。
 */

import { CREATE_ELEMENT_VNODE } from './runtimeHelpers.ts'

/** AST 节点类型枚举 */
export const enum NodeTypes {
  /** 插值表达式 `{{ ... }}` */
  INTERPOLATION,
  /** 插值内部变量 */
  SIMPLE_EXPRESSION,
  /** HTML 标签 */
  ELEMENT,
  /** 普通文本 */
  TEXT,
  /** 根节点 */
  ROOT,
  /** 复合类型 —— 文本与插值的混合（例如 "hi," + _ctx.message） */
  COMPOUND_EXPRESSION,
}

/**
 * 创建一个表示 VNode 调用的 AST 节点。
 *
 * @param context - 转换上下文
 * @param tag - 标签名
 * @param props - 属性
 * @param children - 子节点
 * @returns 表示 `createElementVNode(tag, props, children)` 调用的 AST 节点
 */
export function createVnodeCall(
  context: any,
  tag: any,
  props: any,
  children: any,
) {
  context.helper(CREATE_ELEMENT_VNODE)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
