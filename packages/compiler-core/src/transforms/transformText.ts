/**
 * @file transformText 转换插件 —— 将相邻的文本和插值节点合并为复合类型
 *
 * 将 "hi, " + `{{message}}` 这种相邻的文本和插值表达式
 * 合并为 COMPOUND_EXPRESSION 类型，以便 codegen 阶段生成 `"hi, " + _toDisplayString(...)` 代码。
 */

import { NodeTypes } from '../ast.ts'
import { isTextNode } from '../utils.ts'

/**
 * 文本合并转换插件。
 *
 * 当元素节点的 children 中有相邻的 TEXT 和 INTERPOLATION 节点时，
 * 将它们合并为一个 COMPOUND_EXPRESSION，中间用 " + " 连接。
 *
 * @param node - AST 节点
 * @returns onExit 回调函数
 */
export function transformText(node: any) {
  // 仅处理 ELEMENT 类型节点
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      let currentContainer
      const { children } = node
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isTextNode(child)) {
          // 向后查找相邻的文本/插值节点
          for (let j = i + 1; j < children.length; j++) {
            const nextNode = children[j]
            if (isTextNode(nextNode)) {
              // 创建复合类型的容器
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                }
              }
              currentContainer.children.push(' + ')
              currentContainer.children.push(nextNode)
              // 删除已合并的节点
              children.splice(j, 1)
              // 删除了节点指针前进一位，将指针回调
              j--
            } else {
              // 遇到非文本/插值节点，结束当前合并
              currentContainer = undefined
              break
            }
          }
        }
      }
    }
  }
}
