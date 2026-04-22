import { trackEffects, triggerEffects, isTracking } from './effect.ts'
import { hasChanged, isObject } from '@xunbei-vue/shared'
import { reactive } from './reactive.ts'

class RefImpl {
  private _value: any
  public dep: Set<any> | undefined
  public _rawValue: any
  public __v_isRef = true
  constructor(value: any) {
    //保留一份原始值用作后续比较
    this._rawValue = value
    //如果ref的value值是对象，那对象里面的值会被转换成reactive,如果不是则直接复制为value
    this._value = convert(value)
    this.dep = new Set<any>()
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    //先修改value值，再触发依赖
    //newValue->this._value->是否相等  相等不触发依赖 Object.is 同值相等
    //如果ref是对象，则对象内部会被转换成reactive形式,因此我们这里用this._rawValue原始值作比较
    if (hasChanged(this._rawValue, newValue)) {
      //赋值原始值
      this._rawValue = newValue
      //赋值转换后的值
      this._value = convert(newValue)
      triggerEffects(this.dep)
    }
  }
}
//原始值转换
export function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}
//收集ref依赖
export function trackRefValue(ref: any) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}
//创建ref值
export function ref(value: any) {
  return new RefImpl(value)
}
//判断是否是ref值
export function isRef(ref: any) {
  return !!ref.__v_isRef
}

//如果参数是 ref，则返回内部值，否则返回参数本身。这是 val = isRef(val) ? val.value : val 计算的一个语法糖
export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref
}
//你能以操作普通对象的方式，来操作一个内部可能包含 ref 的对象，而无需时刻使用 .value 来取值或赋值。
export function proxyRefs(objectWithRefs: any) {
  return new Proxy(objectWithRefs, {
    get(target: any, propertyKey: string): any {
      // get -> 发现是一个ref值 那么就返回ref.value
      //not ref -> 直接返回值
      return unRef(Reflect.get(target, propertyKey))
    },
    set(target: any, propertyKey: string, value: any): boolean {
      //set ->ref->调用.value赋值
      //当旧值是ref值，而新值是原始值时，直接.value赋值，可以保留响应式，新值是ref值，则直接赋值就可以。
      if (isRef(target[propertyKey]) && !isRef(value)) {
        return (target[propertyKey].value = value)
      } else {
        return Reflect.set(target, propertyKey, value)
      }
    },
  })
}
