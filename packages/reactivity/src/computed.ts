import { ReactiveEffect } from './effect.ts'
import { triggerEffects } from './effect.ts'
import { trackRefValue } from './ref.ts'

export class ComputedRefImpl {
  public dep: Set<any> | undefined
  private _getter: any
  private _dirty: boolean = true //缓存标识 true：没有缓存值 false:有缓存值
  private _value: any
  private _effect: any
  constructor(getter: any) {
    console.log(this._getter)
    this._getter = getter
    this.dep = new Set<any>()
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerEffects(this.dep)
      }
    })
    this._effect.computed = this
  }
  get value() {
    //get
    trackRefValue(this)
    //当响应式依赖对象发生改变以后 get value获取最新值并收集依赖->dirty赋值true
    if (this._dirty) {
      //缓存标识改变，有缓存值
      this._dirty = false
      this._value = this._effect.run()
    }
    //有缓存值时，直接返回缓存值
    return this._value
  }
}
export function computed(getter: any) {
  return new ComputedRefImpl(getter)
}
