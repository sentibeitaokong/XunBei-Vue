/**
 * @file 组件事件（emit）—— 子组件向父组件传递消息的机制
 *
 * 通过 props 中 onXxx 形式的方法调用，实现 emit 事件触发。
 */

import { toHandleKey, camelize } from '@xunbei-vue/shared'

/**
 * 触发组件事件 —— 在子组件中调用 emit 向父组件发送事件。
 *
 * 事件名会被自动转换为 props 中的 handler key：
 * 例如 emit('add-foo') 会查找 props.onAddFoo 并执行。
 *
 * @param instance - 组件实例
 * @param event - 事件名（支持连字符格式）
 * @param args - 传递给事件处理函数的参数
 */
export function emit(instance: any, event: any, ...args: any[]) {
  const { props } = instance
  // TPP：先写特定行为 -> 重构成通用行为
  // 可执行事件名称
  const handleName = toHandleKey(camelize(event))
  // 获取 props 上对应的 event 事件并执行
  const handler = props[handleName]
  handler && handler(...args)
}
