/**
 * @file reactivity 包入口 —— 响应式系统的公共 API
 *
 * 提供 ref、reactive、computed、effect 等响应式核心能力。
 */

/** ref 相关：创建引用、判断引用、解包引用、代理引用 */
export { ref, proxyRefs, isRef, unRef } from './ref.ts'

/** reactive 相关：响应式对象、只读对象、类型判断 */
export {
  reactive,
  readonly,
  shallowReadonly,
  isProxy,
  isReactive,
  isReadonly,
} from './reactive.ts'

/** effect 相关：副作用追踪与触发 */
export { effect, ReactiveEffect } from './effect.ts'

/** computed 计算属性 */
export { computed } from './computed.ts'
