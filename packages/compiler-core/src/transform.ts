/**
 * @file AST 转换器（Transform）—— 对 AST 进行深度优先遍历并应用转换插件
 *
 * 转换流程：
 * 1. 深度优先遍历 AST
 * 2. 在每个节点上应用 nodeTransforms 转换插件
 * 3. 收集插件返回的退出函数（onExit），在子节点处理完后逆序执行
 * 4. 将最终的 codegenNode 提取到 root.codegenNode 供代码生成使用
 */

import { NodeTypes } from './ast.ts'
import { TO_DISPLAY_STRING } from './runtimeHelpers.ts'

/**
 * 对 AST 应用转换插件。
 *
 * @param root - AST 根节点
 * @param options - 转换选项
 * @param options.nodeTransforms - 节点转换插件数组
 * @returns 转换后的 AST（修改原对象）
 */
export function transform(root: any, options: any = {}): any {
  const context = createTransformContext(root, options)
  // 1. 遍历：深度优先搜索
  // 2. 修改 text 的 content
  traverseNode(root, context)
  // 3. root.codegenNode —— 将数据提取到 root.codegenNode 中
  createRootCodegen(root)
  // 4. 取出所有函数参数
  root.helpers = [...context.helpers.keys()]
}

/**
 * 创建根节点的 codegenNode —— 将 AST 的第一个子节点
 * 的 codegenNode 提取为 root.codegenNode。
 */
function createRootCodegen(root: any) {
  const child = root.children[0]
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode
  } else {
    root.codegenNode = root.children[0]
  }
}

/**
 * 创建转换上下文 —— 存储 AST 根引用、插件列表和辅助函数集合。
 *
 * @param root - AST 根节点
 * @param options - 转换选项
 * @returns 转换上下文对象
 */
function createTransformContext(root: any, options: any): any {
  const context = {
    root,
    /** AST 转换方法（插件） */
    nodeTransforms: options.nodeTransforms || [],
    /** 存储需要导入的辅助函数（Symbol -> 1） */
    helpers: new Map(),
    /** 注册一个辅助函数 */
    helper(key: any) {
      context.helpers.set(key, 1)
    },
  }
  return context
}

/**
 * 深度优先遍历 AST 节点并应用转换插件。
 *
 * @param node - 当前 AST 节点
 * @param context - 转换上下文
 */
function traverseNode(node: any, context: any): any {
  const nodeTransforms = context.nodeTransforms
  // 收集插件返回的退出函数
  const exitFns: any = []
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    const onExit = transform(node, context)
    // 收集 onExit 回调
    if (onExit) exitFns.push(onExit)
  }

  // 根据不同类型进行不同的处理
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 插值表达式需要 toDisplayString 辅助函数
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      // Root 和标签需要深度递归遍历子节点
      transformNode(node, context)
      break
    default:
      break
  }

  // 逆序执行退出插件函数（先处理完子节点再处理父节点）
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

/**
 * 递归处理节点的子节点。
 *
 * @param node - 当前节点
 * @param context - 转换上下文
 */
function transformNode(node: any, context: any): any {
  const children: any = node.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const node = children[i]
      traverseNode(node, context)
    }
  }
}
