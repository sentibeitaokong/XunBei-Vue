/**
 * @file Proxy 处理器 —— reactive/readonly 的 get/set 拦截实现
 *
 * 为不同的响应式模式（mutable / readonly / shallowReadonly）
 * 提供对应的 Proxy 拦截处理器。
 */

import { track, trigger } from './effect.ts'
import { reactive, ReactiveFlags, readonly } from './reactive.ts'
import { extend, isObject } from '@xunbei-vue/shared'

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

/**
 * 创建 getter 拦截器。
 *
 * @param isReadonly - 是否为只读模式
 * @param shallow - 是否为浅层模式
 * @returns get 拦截函数
 */
function createGetter(isReadonly: any = false, shallow: any = false) {
  return function get(target: any, propertyKey: string) {
    // 处理 ReactiveFlags 标识访问 —— 用于 isReactive / isReadonly 判断
    if (propertyKey === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (propertyKey === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    const res = Reflect.get(target, propertyKey)

    // 如果是 shallowReadonly，直接返回数据，不做深层代理
    if (shallow) {
      return res
    }

    // 判断 res 是不是 object 对象，嵌套对象递归执行 reactive / readonly 代理
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    // 非只读模式下收集依赖
    if (!isReadonly) {
      track(target, propertyKey)
    }
    return res
  }
}

/**
 * 创建 setter 拦截器。
 *
 * @returns set 拦截函数，在赋值后触发依赖更新
 */
function createSetter() {
  return function set(target: any, propertyKey: string, value: string) {
    const res = Reflect.set(target, propertyKey, value)
    // 赋值成功后触发依赖
    trigger(target, propertyKey)
    return res
  }
}

/** 可变（reactive）模式的 Proxy 处理器 */
export const mutableHandlers = {
  get,
  set,
}

/** 只读模式的 Proxy 处理器 —— set 会报警告 */
export const readonlyHandlers = {
  get: readonlyGet,
  set(target: any, propertyKey: string) {
    console.warn(
      `key :"${String(propertyKey)}" set 失败，因为 target 是 readonly 类型`,
      target,
    )
    return true
  },
}

/**
 * 浅层只读模式的 Proxy 处理器。
 *
 * 在 readonlyHandlers 的基础上覆盖 get 为 shallowReadonlyGet。
 * 仅表层对象不可修改，嵌套对象不受影响。
 */
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
})
