/**
 * @file runtime-core 包入口 —— 运行时核心 API
 *
 * 包含虚拟 DOM 创建、组件系统、渲染器、调度器、
 * watch、provide/inject 等运行时核心能力。
 */

/** 虚拟 DOM 创建 */
export { h } from './h'
export { renderSlots } from './helpers/renderSlots.ts'
export { createTextVNode, createElementVNode } from './vnode.ts'

/** 组件实例与编译器注册 */
export { getCurrentInstance, registerRuntimeCompiler } from './component.ts'

/** 依赖注入 */
export { provide, inject } from './apiInject.ts'

/** 渲染器 */
export { createRenderer } from './renderer.ts'

/** 调度器 */
export { nextTick } from './scheduler.ts'

/** 值转字符串展示 */
export { toDisplayString } from '@xunbei-vue/shared'

/** watch 监听器 */
export { watch } from './apiWatch.ts'

// 重新导出 reactivity 包的所有内容
export * from '../../reactivity/src'
