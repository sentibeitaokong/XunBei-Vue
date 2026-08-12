/**
 * @file transformElement 转换插件 —— 将元素 AST 节点转换为 codegenNode
 *
 * 该插件注册一个 onExit 回调（返回函数），在子节点处理完毕后执行，
 * 将元素的 tag、props、children 组装为 createVnodeCall 形式的 codegenNode。
 */

import { createVnodeCall, NodeTypes } from '../ast.ts'

/**
 * 元素转换插件。
 *
 * 仅在节点类型为 ELEMENT 时返回 onExit 回调。
 * onExit 在子节点处理完毕后执行，此时子节点的 codegenNode 已就绪。
 *
 * @param node - AST 节点
 * @param context - 转换上下文
 * @returns onExit 回调函数（在子节点处理完后执行）
 */
export function transformElement(node: any, context: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      // 中间处理层

      // tag
      const vnodeTag = `'${node.tag}'`

      // props
      let vnodeProps

      // children
      const { children } = node
      let vnodeChildren = children[0]

      // 组装节点的 tag、props、children 为 codegenNode
      node.codegenNode = createVnodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren,
      )
    }
  }
}
