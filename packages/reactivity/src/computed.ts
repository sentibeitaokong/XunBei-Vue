/**
 * @file computed 计算属性 —— 基于 effect 的延迟求值与缓存机制
 *
 * computed 的特点：
 * 1. 惰性求值 —— 只在访问 .value 时才执行 getter
 * 2. 缓存 —— 依赖未变化时直接返回缓存值
 * 3. 依赖追踪 —— 依赖变化时标记为 dirty，下次访问时重新计算
 */

import { ReactiveEffect } from './effect.ts'
import { triggerEffects } from './effect.ts'
import { trackRefValue } from './ref.ts'

/**
 * ComputedRefImpl —— computed 计算属性的底层实现类。
 *
 * 通过 `_dirty` 标志控制缓存：
 * - `true`：无缓存（需要重新计算）
 * - `false`：有缓存（直接返回缓存值）
 */
export class ComputedRefImpl {
  public dep: Set<any> | undefined
  private _getter: any
  /** 缓存标识：true = 没有缓存值，false = 有缓存值 */
  private _dirty: boolean = true
  /** 缓存的当前值 */
  private _value: any
  private _effect: any
  constructor(getter: any) {
    this._getter = getter
    this.dep = new Set<any>()
    // 创建 effect，并传入 scheduler —— 当依赖变化时：
    // 将 _dirty 标记为 true（需要重新计算），然后触发 computed 自身的依赖
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerEffects(this.dep)
      }
    })
    this._effect.computed = this
  }
  get value() {
    // 收集 computed 自身的依赖（谁在读取这个 computed 值）
    trackRefValue(this)
    // 当响应式依赖对象发生改变后 _dirty 为 true，需要重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    // 有缓存值时直接返回缓存值
    return this._value
  }
}

/**
 * 创建一个计算属性。
 *
 * computed 接受一个 getter 函数，返回一个只读的响应式引用。
 * 只有当依赖的响应式数据发生变化时才会重新计算。
 *
 * @param getter - 计算属性的 getter 函数
 * @returns ComputedRefImpl 实例，通过 .value 访问计算结果
 *
 * @example
 * const count = ref(1)
 * const double = computed(() => count.value * 2)
 * console.log(double.value) // 2
 */
export function computed(getter: any) {
  return new ComputedRefImpl(getter)
}
