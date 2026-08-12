/**
 * @file 编译器工具函数
 */

import { NodeTypes } from './ast.ts'

/**
 * 判断一个节点是否为文本或插值类型。
 *
 * 用于 transformText 中判断相邻节点是否需要合并为复合类型。
 *
 * @param node - AST 节点
 * @returns 如果是 TEXT 或 INTERPOLATION 类型则返回 true
 */
export function isTextNode(node: any) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}
