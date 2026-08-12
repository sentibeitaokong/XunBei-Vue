/**
 * @file ref 引用系统 —— 为原始值提供响应式封装
 *
 * ref 允许我们将任意值包装成响应式引用。
 * 当值为对象时，内部会调用 reactive 进行深度响应式转换。
 */

import { trackEffects, triggerEffects, isTracking } from './effect.ts'
import { hasChanged, isObject } from '@xunbei-vue/shared'
import { reactive } from './reactive.ts'

/**
 * RefImpl —— ref 的底层实现类。
 *
 * 通过 getter/setter 拦截 .value 的读写，实现依赖追踪和触发。
 */
class RefImpl {
  private _value: any
  public dep: Set<any> | undefined
  public _rawValue: any
  /** 标记为 ref 对象 */
  public __v_isRef = true
  constructor(value: any) {
    // 保留一份原始值用作后续比较
    this._rawValue = value
    // 如果 ref 的 value 值是对象，则内部调用 reactive 转换；否则直接赋值
    this._value = convert(value)
    this.dep = new Set<any>()
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    // 先修改 value 值，再触发依赖
    // newValue -> this._value -> 是否相等，相等不触发依赖（Object.is 同值相等）
    // 如果 ref 是对象，内部会被转成 reactive，因此用 this._rawValue 原始值作比较
    if (hasChanged(this._rawValue, newValue)) {
      // 更新原始值
      this._rawValue = newValue
      // 更新转换后的值
      this._value = convert(newValue)
      triggerEffects(this.dep)
    }
  }
}

/**
 * 值转换 —— 如果是对象则创建 reactive，否则原样返回。
 *
 * @param value - 要转换的值
 * @returns 转换后的值（对象 -> reactive，非对象 -> 原值）
 */
export function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}

/**
 * 收集 ref 的依赖。
 *
 * @param ref - RefImpl 实例
 */
export function trackRefValue(ref: any) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

/**
 * 创建一个响应式引用（ref）。
 *
 * ref 是 Vue 响应式系统中处理基本类型值的标准方式。
 * 对于对象类型，内部会自动调用 reactive 进行深度代理。
 *
 * @param value - 初始值
 * @returns 一个包含 .value 属性的 RefImpl 实例
 *
 * @example
 * const count = ref(0)
 * count.value++ // 触发视图更新
 *
 * const obj = ref({ a: 1 })
 * obj.value.a = 2 // 深度响应式
 */
export function ref(value: any) {
  return new RefImpl(value)
}

/**
 * 判断一个值是否为 ref 对象。
 *
 * @param ref - 要检查的值
 * @returns 如果是 ref 则返回 true
 */
export function isRef(ref: any) {
  return !!ref.__v_isRef
}

/**
 * 如果是 ref 则返回其内部值（.value），否则返回参数本身。
 *
 * 这是 `val = isRef(val) ? val.value : val` 的语法糖。
 *
 * @param ref - 可能是 ref 的值
 * @returns ref 的内部值或原值
 */
export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref
}

/**
 * 创建一个代理对象，使其内部的 ref 属性无需 .value 即可访问和赋值。
 *
 * 在 Vue 组件的 template 和 setup() 返回值中，ref 会被自动解包，
 * 此函数就是实现该能力的基础。
 *
 * @param objectWithRefs - 内部可能包含 ref 的对象
 * @returns 一个 Proxy，自动解包/包装 ref 属性
 *
 * @example
 * const state = proxyRefs({ count: ref(0) })
 * console.log(state.count) // 0，无需 .value
 * state.count = 5          // 自动赋给 .value
 */
export function proxyRefs(objectWithRefs: any) {
  return new Proxy(objectWithRefs, {
    get(target: any, propertyKey: string): any {
      // get -> 发现是 ref 值，返回 ref.value；不是 ref，直接返回值
      return unRef(Reflect.get(target, propertyKey))
    },
    set(target: any, propertyKey: string, value: any): boolean {
      // set -> ref -> 调用 .value 赋值
      // 当旧值是 ref 而新值是原始值时，直接 .value 赋值可以保留响应式；
      // 新值也是 ref 时则直接赋值即可
      if (isRef(target[propertyKey]) && !isRef(value)) {
        return (target[propertyKey].value = value)
      } else {
        return Reflect.set(target, propertyKey, value)
      }
    },
  })
}
