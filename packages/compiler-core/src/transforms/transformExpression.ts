/**
 * @file transformExpression 转换插件 —— 将插值表达式变量加上 _ctx 前缀
 *
 * 将 `{{ message }}` 中的 `message` 转换为 `_ctx.message`，
 * 使得在 render 函数中通过 `_ctx` 访问组件实例的属性。
 */

import { NodeTypes } from '../ast.ts'

/**
 * 表达式转换插件。
 *
 * 处理 INTERPOLATION 类型的节点，将其 content（表达式变量）
 * 添加 `_ctx.` 前缀。
 *
 * 例如：`{{ message }}` -> `_ctx.message`
 *
 * @param node - AST 节点
 */
export function transformExpression(node: any) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content)
  }
}

/**
 * 为表达式内容添加 `_ctx.` 前缀。
 *
 * @param node - 插值表达式的 content 节点
 * @returns 处理后的表达式节点
 */
function processExpression(node: any) {
  node.content = `_ctx.${node.content}`
  return node
}
