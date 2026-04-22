//生成string代码
import { NodeTypes } from './ast.ts'
import { CREATE_ELEMENT_VNODE, helperMapName } from './runtimeHelpers.ts'
import { TO_DISPLAY_STRING } from './runtimeHelpers.ts'
import { isString } from '@xunbei-vue/shared'

export function generate(ast: any) {
  const context = createCodegenContext()
  const { push } = context
  //生成函数导入代码 例：const { toDisplayString: _toDisplayString } = Vue
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

function genFunctionPreamble(ast: any, context: any) {
  const { push } = context
  const VueBinging = 'Vue'
  const aliasHelper = (s: typeof TO_DISPLAY_STRING) =>
    `${helperMapName[s]}:_${helperMapName[s]}`
  if (ast.helpers.length > 0) {
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')}}=${VueBinging}`)
  }
  push('\n')
  push('return ')
}

function createCodegenContext(): any {
  const context = {
    code: '',
    push(source: any) {
      context.code += source
    },
    helper(key: typeof TO_DISPLAY_STRING) {
      return `_${helperMapName[key]}`
    },
  }
  return context
}
function genNode(node: any, context: any) {
  switch (node.type) {
    //处理string类型
    case NodeTypes.TEXT:
      genText(node, context)
      break
    //处理插值类型
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    //处理表达式
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    //处理标签
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    //处理复合类型
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    default:
      break
  }
}
//处理string类型
function genText(node: any, context: any) {
  const { push } = context
  push(`'${node.content}'`)
}

//处理插值类型
function genInterpolation(node: any, context: any) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}
//处理表达式
function genExpression(node: any, context: any) {
  const { push } = context
  push(`${node.content}`)
}
//处理标签
function genElement(node: any, context: any) {
  const { push, helper } = context
  const { tag, children, props } = node
  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  push(')')
}
//假值转换成Null
function genNullable(args: any) {
  return args.map((arg: any) => arg || 'null')
}
//将数组转化成string类型，并且连接处添加逗号
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

//处理复合类型
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
