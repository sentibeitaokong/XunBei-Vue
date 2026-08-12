/**
 * @file 编译入口 —— 串联 parse -> transform -> codegen 三阶段
 *
 * 完整的编译流程：
 * 1. parse：模板字符串 -> AST（抽象语法树）
 * 2. transform：AST -> 优化后的 AST（应用转换插件）
 * 3. codegen：AST -> render 函数字符串
 */

import { generate } from './codegen'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformExpression } from './transforms/transformExpression'
import { transformText } from './transforms/transformText'

/**
 * 完整的模板编译 —— 将模板字符串转换为 render 函数代码。
 *
 * 流程：template -> parse -> AST -> transform -> 优化后的 AST -> codegen -> code
 *
 * @param template - 模板字符串
 * @returns 包含 render 函数代码字符串的对象 `{ code }`
 */
export function baseCompile(template: any) {
  // 1. 解析模板为 AST
  const ast: any = baseParse(template)
  // 2. 应用转换插件（表达式、元素、文本/插值合并）
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })
  // 3. 生成代码
  return generate(ast)
}
