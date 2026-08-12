/**
 * @file watch 监听器 —— 监听响应式数据变化并执行回调
 *
 * 支持 watch(source, cb) 和 watchEffect(source) 两种 API。
 * 支持 immediate（立即执行）和 deep（深度监听）选项。
 */

import { isReactive, ReactiveEffect } from '@xunbei-vue/reactivity'
import { queuePreFlushCb } from './scheduler'
import { EMPTY_OBJ, hasChanged, isObject } from '@xunbei-vue/shared'

/**
 * 创建一个自动追踪依赖的副作用 —— watchEffect。
 *
 * 不需要手动指定数据源，会自动追踪函数内部访问的响应式数据。
 * 支持 onCleanup —— 在副作用重新执行或停止时清理资源。
 *
 * @param source - 副作用函数，接收 onCleanup 作为参数
 * @returns 停止副作用的函数
 *
 * @example
 * const stop = watchEffect((onCleanup) => {
 *   const timer = setInterval(() => {}, 1000)
 *   onCleanup(() => clearInterval(timer))
 * })
 * stop() // 停止监听
 */
export function watchEffect(source: any) {
  // 执行依赖里面的回调函数
  function job() {
    effect.run()
  }
  // 存储清理函数
  let cleanup: any
  // 第一次执行 onCleanup，存储回调函数的指针
  const onCleanup = function (fn: any) {
    // 当执行 stop 清空依赖后执行的副作用函数
    cleanup = effect.onStop = () => {
      fn()
    }
  }
  function getter() {
    // 当 cleanup 有值时执行 onCleanup 里面的回调
    if (cleanup) {
      cleanup()
    }
    source(onCleanup)
  }

  // 创建 effect，将依赖添加到组件更新之前的队列
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job)
  })
  // 默认执行一次依赖收集
  effect.run()
  // 返回清空依赖的方法
  return () => {
    effect.stop()
  }
}

/** watch 的可选配置 */
export interface WatchOptions<immediate = boolean> {
  /** 是否在创建时立即执行回调 */
  immediate?: immediate
  /** 是否深度监听 */
  deep?: boolean
}

/**
 * 监听响应式数据源的变化，在变化时执行回调。
 *
 * source 可以是：
 * - 一个 ref（包括 computed）
 * - 一个响应式对象（reactive）
 * - 一个 getter 函数
 * - 多个数据源组成的数组
 *
 * @param source - 要监听的数据源
 * @param cb - 回调函数，接收 (newValue, oldValue)
 * @param options - 可选配置
 * @param options.immediate - 是否立即执行回调
 * @param options.deep - 是否深度监听（reactive 对象默认 true）
 * @returns 停止监听的函数
 *
 * @example
 * watch(() => state.count, (newVal, oldVal) => {
 *   console.log(`count changed from ${oldVal} to ${newVal}`)
 * })
 */
export function watch(source: any, cb: Function, options?: WatchOptions) {
  return doWatch(source, cb, options)
}

/**
 * watch 的底层实现。
 *
 * @param source - 数据源
 * @param cb - 回调函数
 * @param options - immediate 和 deep 配置
 * @returns 停止监听的函数
 */
function doWatch(
  source: any,
  cb: Function,
  { immediate, deep }: WatchOptions = EMPTY_OBJ,
) {
  let getter: () => any
  // 判断是否为 reactive 对象，是的话默认 deep 为 true
  if (isReactive(source)) {
    getter = () => source
    deep = true
  } else {
    getter = () => {}
  }

  // 深度监听时，用 traverse 递归触发所有属性的 get 来收集依赖
  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let oldValue = {}
  const job = () => {
    // 判断是否需要执行回调函数更新值
    if (cb) {
      const newValue = effect.run()
      if (deep || hasChanged(newValue, oldValue)) {
        cb(newValue, oldValue)
        oldValue = newValue
      }
    }
  }

  // 创建调度器 —— 将回调放入 pre flush 队列
  let scheduler = () => queuePreFlushCb(job)
  const effect = new ReactiveEffect(getter, scheduler)

  // 当有回调函数时：
  // - immediate 为 true 则立即执行回调
  // - 否则只获取当前值（触发依赖收集）
  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }

  return () => {
    effect.stop()
  }
}

/**
 * 深度遍历一个值，触发所有属性的 getter 以收集依赖。
 *
 * 用于 watch 的 deep: true 模式。
 *
 * @param value - 要遍历的值
 * @param seen - 已访问的 Set（避免循环引用）
 * @returns 原值
 */
export function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value)) {
    return value
  }
  seen = seen || new Set()

  seen.add(value)

  for (const key in value as object) {
    traverse((value as any)[key], seen)
  }
  return value
}
