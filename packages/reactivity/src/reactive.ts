/**
 * @file reactive 响应式对象 —— 基于 Proxy 的响应式系统入口
 *
 * 提供 reactive、readonly、shallowReadonly 三个核心 API，
 * 以及 isReactive、isReadonly、isProxy 等类型判断函数。
 */

import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers.ts'
import { isObject } from '@xunbei-vue/shared'

/** 响应式标识枚举 —— 通过特殊 key 判断对象的响应式类型 */
export const enum ReactiveFlags {
  /** 是否为 reactive 响应式对象 */
  IS_REACTIVE = '__v_isReactive',
  /** 是否为 readonly 只读对象 */
  IS_READONLY = '__v_isReadonly',
}

/**
 * 创建一个深度响应式的对象代理。
 *
 * 内部基于 Proxy 实现，会自动追踪对象属性的 get/set 操作。
 *
 * @param raw - 原始对象
 * @returns 响应式代理对象
 */
export function reactive(raw: any) {
  return createReactiveObject(raw, mutableHandlers)
}

/**
 * 创建一个深度只读的对象代理。
 *
 * readonly 对象不会收集依赖也不会触发 set 更新。
 *
 * @param raw - 原始对象
 * @returns 只读代理对象
 */
export function readonly(raw: any) {
  return createReactiveObject(raw, readonlyHandlers)
}

/**
 * 创建一个浅层只读的对象代理。
 *
 * shallowReadonly 只有表层对象是只读的，嵌套对象不会被代理。
 *
 * @param raw - 原始对象
 * @returns 浅层只读代理对象
 */
export function shallowReadonly(raw: any) {
  return createReactiveObject(raw, shallowReadonlyHandlers)
}

/**
 * 创建响应式/只读代理对象的内部工厂函数。
 *
 * @param target - 要代理的目标对象
 * @param baseHandlers - Proxy 处理器（get/set 拦截器）
 * @returns 代理对象；如果 target 不是对象则原样返回
 */
function createReactiveObject(target: any, baseHandlers: any) {
  if (!isObject(target)) {
    console.warn(`target :"${target}"必须是一个对象`)
    return target
  }
  return new Proxy(target, baseHandlers)
}

/**
 * 检查一个值是否是由 reactive() 创建的响应式代理。
 *
 * @param value - 要检查的值
 * @returns 如果是 reactive 代理则返回 true
 */
export function isReactive(value: any) {
  // 通过访问 ReactiveFlags.IS_REACTIVE 触发 get 拦截来判断
  return !!value[ReactiveFlags.IS_REACTIVE]
}

/**
 * 检查一个值是否是由 readonly() 或 shallowReadonly() 创建的只读代理。
 *
 * 只读对象的属性可以被修改（如果是嵌套的 reactive），
 * 但不能通过该代理直接赋值。
 *
 * @param value - 要检查的值
 * @returns 如果是只读代理则返回 true
 */
export function isReadonly(value: any) {
  return !!value[ReactiveFlags.IS_READONLY]
}

/**
 * 检查一个值是否是 reactive() 或 readonly() 创建的代理对象。
 *
 * @param value - 要检查的值
 * @returns 如果是 reactive 或 readonly 代理则返回 true
 */
export function isProxy(value: any) {
  return isReadonly(value) || isReactive(value)
}
