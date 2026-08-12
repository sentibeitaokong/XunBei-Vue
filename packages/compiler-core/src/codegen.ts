/**
 * @file 代码生成器（Codegen）—— 将 AST 生成 render 函数字符串
 *
 * 负责将经过 transform 优化后的 AST 转换为可执行的 JavaScript 代码字符串。
 * 生成的代码形如：
 * ```
 * const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode } = Vue
 * return function render(_ctx, _cache) {
 *   return _createElementVNode("div", null, "hi, " + _toDisplayString(_ctx.message))
 * }
 * ```
 */

import { NodeTypes } from './ast.ts'
import { CREATE_ELEMENT_VNODE, helperMapName } from './runtimeHelpers.ts'
import { TO_DISPLAY_STRING } from './runtimeHelpers.ts'
import { isString } from '@xunbei-vue/shared'

/**
 * 生成 render 函数代码 —— 将 AST 转换为包含 `{ code }` 的结果。
 *
 * @param ast - 经过 transform 优化后的 AST
 * @returns 包含 code 字符串的对象
 */
export function generate(ast: any) {
  const context = createCodegenContext()
  const { push } = context

  // 生成函数导入代码，例如：
  // const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode } = Vue
  genFunctionPreamble(ast, context)

  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')
  push(`function ${functionName}(${signature}){`)
  push('return ')
  genNode(ast.codegenNode, context)
  push('}')

  return {
    code: context.code,
  }
}

/**
 * 生成函数前导代码 —— 辅助函数的解构导入语句。
 */
function genFunctionPreamble(ast: any, context: any) {
  const { push } = context
  const VueBinging = 'Vue'
  const aliasHelper = (s: typeof TO_DISPLAY_STRING) =>
    `${helperMapName[s]}:_${helperMapName[s]}`
  if (ast.helpers.length > 0) {
    push(
      `const { ${ast.helpers.map(aliasHelper).join(', ')}}=${VueBinging}`,
    )
  }
  push('\n')
  push('return ')
}

/**
 * 创建代码生成上下文 —— 提供代码拼接与辅助函数名映射能力。
 */
function createCodegenContext(): any {
  const context = {
    code: '',
    /** 向 code 末尾追加字符串 */
    push(source: any) {
      context.code += source
    },
    /** 获取辅助函数的别名（带 _ 前缀） */
    helper(key: typeof TO_DISPLAY_STRING) {
      return `_${helperMapName[key]}`
    },
  }
  return context
}

/**
 * 根据节点类型分发到对应的代码生成函数。
 */
function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    default:
      break
  }
}

/**
 * 生成文本节点代码 —— `'text content'`。
 */
function genText(node: any, context: any) {
  const { push } = context
  push(`'${node.content}'`)
}

/**
 * 生成插值节点代码 —— `_toDisplayString(_ctx.message)`。
 */
function genInterpolation(node: any, context: any) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

/**
 * 生成简单表达式代码 —— 直接输出表达式内容。
 */
function genExpression(node: any, context: any) {
  const { push } = context
  push(`${node.content}`)
}

/**
 * 生成元素节点代码 —— `_createElementVNode("div", null, [children])`。
 */
function genElement(node: any, context: any) {
  const { push, helper } = context
  const { tag, children, props } = node
  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  push(')')
}

/**
 * 将数组中的假值转换为字符串 "null"。
 *
 * @param args - 参数数组（可能包含 undefined）
 * @returns 转换后的数组
 */
function genNullable(args: any) {
  return args.map((arg: any) => arg || 'null')
}

/**
 * 生成节点列表代码 —— 将多个节点用逗号连接。
 */
function genNodeList(nodes: any, context: any) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

/**
 * 生成复合表达式代码 —— 文本与插值的混合。
 *
 * 例如："hi, " + _toDisplayString(_ctx.message)
 */
function genCompoundExpression(node: any, context: any) {
  const { push } = context
  const { children } = node
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}
