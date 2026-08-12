/**
 * @file 模板解析器（Parser）—— 将模板字符串解析为 AST
 *
 * 负责将 Vue 模板（如 `<div>hi, {{message}}</div>`）解析为
 * 抽象语法树（AST），是整个编译流程的第一步。
 *
 * 支持的语法：
 * - HTML 标签（`<div>`, `<p>` 等）
 * - 插值表达式（`{{ variable }}`）
 * - 普通文本
 */

import { NodeTypes } from './ast.ts'

/** 标签类型的枚举：开始标签或结束标签 */
const enum TagType {
  Start,
  End,
}

/**
 * 基础编译入口 —— 将模板字符串解析为 AST 根节点。
 *
 * @param content - 模板字符串
 * @returns AST 根节点，包含解析后的子节点数组
 */
export function baseParse(content: string) {
  // 序列化文本
  const context = createParseContext(content)
  // 返回编译后的数据（存储解析的标签数组）
  return createRoot(parseChildren(context, []))
}

/**
 * 创建解析上下文 —— 封装模板字符串为可推进解析的上下文对象。
 *
 * @param content - 模板字符串
 * @returns 解析上下文对象
 */
function createParseContext(content: string) {
  return {
    source: content,
  }
}

/**
 * 创建 AST 根节点。
 *
 * @param children - 根节点的子节点数组
 * @returns 根节点
 */
function createRoot(children: any) {
  return {
    children,
    type: NodeTypes.ROOT,
  }
}

/**
 * 递归解析子节点 —— 不断从 context.source 中解析出节点，
 * 直到遇到结束标签或内容为空。
 *
 * @param context - 解析上下文
 * @param ancestors - 父标签栈（用于判断结束标签匹配）
 * @returns AST 节点数组
 */
function parseChildren(context: any, ancestors: any) {
  const nodes: any[] = []
  // 没有结束标识时就一直解析
  while (!isEnd(context, ancestors)) {
    let node: any
    const s = context.source
    // 以 `{{` 开头 -> 解析插值表达式
    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // 以 `<` 开头且第二个字符是小写字母 -> 解析 HTML 元素标签
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }
    // 不是插值也不是标签开头，那就是普通文本
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}

/**
 * 判断解析是否应该结束。
 *
 * 结束条件：
 * 1. 遇到匹配的开始标签对应的结束标签
 * 2. source 已经没有内容
 */
function isEnd(context: any, ancestors: any) {
  const s: any = context.source
  if (s.startsWith('</')) {
    // 遍历之前存储过的开始标签，比对是否相同，相同则说明需要结束解析
    for (let i: number = ancestors.length - 1; i >= 0; i--) {
      const currentTag = ancestors[i].tag
      if (startsWithEndTagOpen(s, currentTag)) {
        return true
      }
    }
  }
  return !s
}

/**
 * 将 HTML 元素标签转换为 AST 节点。
 *
 * 例：`<div>hi, {{message}}</div>`
 *
 * @param context - 解析上下文
 * @param ancestors - 父标签栈
 * @returns 元素 AST 节点
 */
function parseElement(context: any, ancestors: any) {
  // 解析开始标签 -> 返回元素 AST 节点
  const element: any = parseTag(context, TagType.Start)
  // 回溯算法：存储解析过的标签
  ancestors.push(element)
  // 递归解析标签内的内容
  element.children = parseChildren(context, ancestors)
  // 当开始解析闭合标签时，弹出之前解析过的开始标签
  ancestors.pop()
  // 判断弹出的标签和现在解析的闭合标签是否一致
  if (startsWithEndTagOpen(context.source, element.tag)) {
    // 解析闭合标签并移除
    parseTag(context, TagType.End)
  } else {
    throw new Error('缺少结束标签:' + element.tag)
  }
  return element
}

/**
 * 判断 source 是否以指定 tag 的结束标签开头。
 */
function startsWithEndTagOpen(source: any, tag: any) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag
  )
}

/**
 * 解析标签（开始或结束）。
 *
 * @param context - 解析上下文
 * @param type - 标签类型（Start / End）
 * @returns 开始标签返回元素 AST 节点，结束标签不返回值
 */
function parseTag(context: any, type: TagType) {
  // 解析开始和闭合的 div 标签
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  // 提取 tag（如 "div"）
  const tag = match[1]
  // 删除处理完成的代码（如 "<div" 或 "</div"）
  advanceBy(context, match[0].length)
  // 删除 ">"
  advanceBy(context, 1)

  // 闭合标签不返回 AST 节点
  if (type === TagType.End) return

  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
    children: [],
  }
}

/**
 * 解析普通文本内容。
 *
 * 解析文本时，遇到 `{{` 或 `<` 就停止 ——
 * 防止吞掉后面的插值表达式或子标签。
 */
function parseText(context: any) {
  // 1. 获取当前文本的内容
  let endIndex = context.source.length
  let endTokens = ['{{', '<']
  for (let i = 0; i < endTokens.length; i++) {
    // 找到最近的 `{{` 或 `<`，记录其下标
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }
  // 2. 推进，删除文本内容
  const content = parseTextData(context, endIndex)
  return {
    type: NodeTypes.TEXT,
    content: content,
  }
}

/**
 * 解析插值表达式 `{{ expression }}`。
 *
 * @param context - 解析上下文
 * @returns 插值 AST 节点
 */
function parseInterpolation(context: any) {
  const openDelLimiter = '{{'
  const closeDelLimiter = '}}'
  // 找到 `}}` 之前的位置
  const closeIndex = context.source.indexOf(
    closeDelLimiter,
    openDelLimiter.length,
  )
  // 去掉左边的 `{{`
  advanceBy(context, openDelLimiter.length)
  // 取到 message 的长度
  const rawContentLength = closeIndex - openDelLimiter.length
  // 取出 message 的内容
  const rawContent = parseTextData(context, rawContentLength)
  // 去除表达式变量左右的空格
  const content = rawContent.trim()
  // 删除右边的 `}}`
  advanceBy(context, closeDelLimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  }
}

/**
 * 推进解析位置 —— 将已解析的部分从 source 中移除。
 *
 * @param context - 解析上下文
 * @param length - 要移除的字符数量
 */
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}

/**
 * 截取并移除 source 前面的 length 个字符。
 *
 * @param context - 解析上下文
 * @param length - 要截取的长度
 * @returns 截取的文本内容
 */
function parseTextData(context: any, length: number) {
  const content = context.source.slice(0, length)
  advanceBy(context, length)
  return content
}
