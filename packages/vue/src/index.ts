/**
 * @file XunBei-Vue 包入口 —— 框架的最终出口
 *
 * 职责：
 * 1. 重新导出 runtime-dom 的全部 API（包含 runtime-core 和 reactivity）
 * 2. 注册运行时模板编译器 —— 将 template 编译为 render 函数
 *
 * 包依赖链：vue -> runtime-dom -> runtime-core -> reactivity
 */

/** 重新导出 runtime-dom 的全部 API */
export * from '@xunbei-vue/runtime-dom'

import { baseCompile } from '@xunbei-vue/compiler-core'
import * as runtimeDom from '@xunbei-vue/runtime-dom'
import { registerRuntimeCompiler } from '@xunbei-vue/runtime-dom'

/**
 * 将模板字符串编译为 render 函数。
 *
 * 通过 baseCompile 生成的 code 字符串，
 * 使用 `new Function` + runtimeDom 创建可执行的 render 函数。
 *
 * @param template - 模板字符串
 * @returns render 函数 —— 接受 _ctx 和 _cache 参数
 *
 * @example
 * // 输入模板 "<div>hi, {{message}}</div>"
 * // 生成的 render 函数形如：
 * // function render(_ctx, _cache) {
 * //   return _createElementVNode("div", null, "hi, " + _toDisplayString(_ctx.message))
 * // }
 */
function compileToFunction(template: any) {
  // 将模板编译为 render 函数字符串
  const { code } = baseCompile(template)

  // 1. 传入 runtimeDom 作为实参，赋值给形参 Vue
  //    相当于：const { toDisplayString: _toDisplayString, ... } = Vue
  // 2. 执行函数体，返回结果赋值给 render
  const render: any = new Function('Vue', code)(runtimeDom)
  return render
}

/** 注册运行时编译器 —— 使组件支持 template 选项 */
registerRuntimeCompiler(compileToFunction)
