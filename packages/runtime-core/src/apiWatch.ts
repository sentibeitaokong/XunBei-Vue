import { isReactive, ReactiveEffect } from '@xunbei-vue/reactivity'
import { queuePreFlushCb } from './scheduler'
import { EMPTY_OBJ, hasChanged, isObject } from '@xunbei-vue/shared'

export function watchEffect(source: any) {
  //执行依赖里面的回调函数
  function job() {
    effect.run()
  }
  //存储回调函数
  let cleanup: any
  //第一次执行onCleanup,存储回调函数的指针
  const onCleanup = function (fn: any) {
    //当执行stop清空依赖后执行的副作用函数
    cleanup = effect.onStop = () => {
      fn()
    }
  }
  function getter() {
    //当cleanup有值时，才执行onCleanup里面的回调函数
    if (cleanup) {
      cleanup()
    }
    source(onCleanup)
  }

  //添加依赖，将依赖添加到组件更新之前的队列
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job)
  })
  //默认依赖执行一次
  effect.run()
  //返回清空依赖的方法
  return () => {
    effect.stop()
  }
}

export interface WatchOptions<immediate = boolean> {
  immediate?: immediate
  deep?: boolean
}
//watch实现
export function watch(source: any, cb: Function, options?: WatchOptions) {
  return doWatch(source, cb, options)
}
//watch 的第一个参数可以是不同形式的“数据源”：
// 它可以是一个 ref (包括计算属性)、一个响应式对象、一个 getter 函数、或多个数据源组成的数组：
//cb回调函数
//immeidate 是否立即执行 deep深度监听
function doWatch(
  source: any,
  cb: Function,
  { immediate, deep }: WatchOptions = EMPTY_OBJ,
) {
  //创建一个空函数
  let getter: () => any
  //判断是否为reactive对象，是的话默认deep为true
  if (isReactive(source)) {
    getter = () => source
    deep = true
  } else {
    getter = () => {}
  }
  //
  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  let oldValue = {}
  const job = () => {
    //判断是否需要执行回调函数更新值
    if (cb) {
      const newValue = effect.run()
      if (deep || hasChanged(newValue, oldValue)) {
        cb(newValue, oldValue)
        oldValue = newValue
      }
    }
  }
  //创建调度器
  let scheduler = () => queuePreFlushCb(job)
  //创建依赖
  const effect = new ReactiveEffect(getter, scheduler)
  //当有回调函数，immediate为true立即执行回调函数，否则只获取当前值
  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }
  //返回停止依赖的方法
  return () => {
    effect.stop()
  }
}

/**
 * 依次执行 getter，从而触发依赖收集
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
