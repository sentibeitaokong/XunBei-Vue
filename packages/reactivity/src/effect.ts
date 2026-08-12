/**
 * @file 响应式系统的核心 —— effect 依赖追踪与触发
 *
 * 实现了 Vue 3 响应式系统中最核心的 effect、track、trigger 机制。
 * effect 负责收集依赖并执行副作用函数；track 在 get 时收集依赖；
 * trigger 在 set 时触发依赖更新。
 */

import { extend } from '@xunbei-vue/shared'

/**
 * Runner 接口 —— effect 返回的函数类型。
 *
 * 它既可以作为函数直接调用（手动执行副作用），
 * 也挂载了对应的 ReactiveEffect 实例。
 */
export interface Runner {
  (): any
  effect: ReactiveEffect
}

/** 调度器函数类型，用于自定义副作用的执行时机 */
export type EffectScheduler = (...args: any[]) => any

/** ReactiveEffect 构造函数的可选配置 */
export interface ReactiveEffectOptions {
  /** 是否延迟执行，为 true 时不会立即执行副作用 */
  lazy?: boolean
  /** 自定义调度器 */
  scheduler?: EffectScheduler
  /** stop 后的回调 */
  onStop?: () => any
}

let activeEffect: any
let shouldTrack: any

/**
 * 响应式副作用类 —— effect 函数的底层实现。
 *
 * 每个 effect 实例包含：
 * - 一个要执行的函数 `_fn`
 * - 一个依赖数组 `deps`（存储所有收集到该 effect 的 dep）
 * - 一个 `active` 标志控制是否继续收集依赖
 * - 一个可选的调度器 `scheduler`
 */
export class ReactiveEffect {
  private _fn: any
  /** 标记是否来自 computed */
  computed: any
  /** 存储所有依赖此 effect 的 dep（Set） */
  deps = []
  /** 响应式是否激活，为 false 时不再追踪依赖 */
  active = true
  /** stop 后的回调 —— 清除副作用 */
  onStop?: () => void
  public scheduler: Function | undefined
  constructor(fn: any, scheduler: any) {
    this._fn = fn
    this.scheduler = scheduler
  }
  /**
   * 执行副作用函数，在执行期间会收集依赖。
   *
   * 利用 shouldTrack 区分 stop 后的状态 —— stop 后不再收集依赖。
   */
  run() {
    // 收集依赖 —— 利用 shouldTrack 来区分 stop 以后不让收集依赖
    if (!this.active) {
      return this._fn()
    }
    shouldTrack = true
    activeEffect = this
    // 执行 fn 方法时会收集依赖，收集完依赖再把 shouldTrack 置为 false，防止依赖再次重复收集
    const result = this._fn()
    // reset
    shouldTrack = false
    return result
  }
  /**
   * 停止该 effect 的响应式追踪，清除所有依赖关系。
   */
  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

/**
 * 清除 effect 的所有依赖。
 *
 * 遍历 effect.deps 中的每个 dep（Set），从中删除该 effect，
 * 然后清空 deps 数组。
 */
function cleanupEffect(effect: any) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

/**
 * 创建一个响应式副作用函数。
 *
 * 当被访问的响应式数据发生变化时，该副作用会重新执行。
 *
 * @param fn - 要执行的副作用函数
 * @param options - 可选配置项
 * @param options.lazy - 是否延迟执行，默认 false
 * @param options.scheduler - 自定义调度器，用于控制副作用的执行时机
 * @returns 返回一个 Runner 函数，调用后可手动执行副作用
 *
 * @example
 * const count = reactive({ value: 0 })
 * effect(() => {
 *   console.log(count.value) // 自动追踪依赖
 * })
 */
export function effect(fn: any, options?: ReactiveEffectOptions) {
  const scheduler = options && options.scheduler
  const _effect = new ReactiveEffect(fn, scheduler)
  // 合并 options 选项
  extend(_effect, options)
  // 懒执行：lazy 为 true 时不立即执行
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect
  // 手动执行更新的函数
  return runner
}

/**
 * 依赖收集的目标映射表。
 *
 * 结构：target（目标对象） -> key（属性名） -> dep（依赖集合 Set）
 */
const targetMap = new Map()

/**
 * 收集依赖 —— 在 get 拦截中调用。
 *
 * 将当前的 activeEffect 添加到 target[key] 对应的依赖集合中。
 *
 * @param target - 目标对象
 * @param propertyKey - 被访问的属性名
 */
export function track(target: any, propertyKey: string) {
  // 状态为不收集依赖时直接返回
  if (!isTracking()) return

  // target（目标） -> key（目标属性） -> dep（依赖项）
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(propertyKey)
  if (!dep) {
    dep = new Set()
    depsMap.set(propertyKey, dep)
  }
  trackEffects(dep)
}

/**
 * 将当前 activeEffect 添加到指定的 dep 集合中。
 *
 * 同时在该 effect 的 deps 数组中反向记录该 dep，
 * 用于后续 stop 时能清除所有依赖。
 *
 * @param dep - 依赖集合（Set）
 */
export function trackEffects(dep: any) {
  // 避免重复收集依赖
  if (dep.has(activeEffect)) return
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

/**
 * 当前是否处于依赖收集阶段。
 *
 * 需要同时满足：
 * 1. shouldTrack 为 true（未被 stop）
 * 2. activeEffect 不为 undefined（有活跃的 effect）
 */
export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

/**
 * 触发依赖 —— 在 set 拦截中调用。
 *
 * 找到 target[key] 对应的所有 effect 并执行它们。
 *
 * @param target - 目标对象
 * @param propertyKey - 被修改的属性名
 */
export function trigger(target: any, propertyKey: string) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  let dep = depsMap.get(propertyKey)
  if (!dep) {
    return
  }
  triggerEffects(dep)
}

/**
 * 依次执行 dep 集合中的每个 effect。
 *
 * 如果 effect 有 scheduler，则调用 scheduler；
 * 否则直接调用 effect.run()。
 *
 * @param dep - 依赖集合（Set）
 */
export function triggerEffects(dep: any) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

/**
 * 停止一个 effect 的响应式追踪。
 *
 * @param runner - effect() 返回的 Runner 函数
 */
export function stop(runner: Runner): void {
  runner.effect?.stop()
}
