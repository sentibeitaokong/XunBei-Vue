import { track, trigger } from './effect.ts'
import { reactive, ReactiveFlags, readonly } from './reactive.ts'
import { extend, isObject } from '@vue/shared'

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)
//get
function createGetter(isReadonly: any = false, shallow: any = false) {
  return function get(target: any, propertyKey: string) {
    if (propertyKey === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (propertyKey === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    const res = Reflect.get(target, propertyKey)

    //如果是shallowReadonly,则shallow为true,直接返回数据
    if (shallow) {
      return res
    }

    //判断res是不是object对象
    if (isObject(res)) {
      //对象嵌套执行reactive和readonly方法
      return isReadonly ? readonly(res) : reactive(res)
    }
    if (!isReadonly) {
      //依赖收集
      track(target, propertyKey)
    }
    return res
  }
}
//set
function createSetter() {
  return function set(target: any, propertyKey: string, value: string) {
    const res = Reflect.set(target, propertyKey, value)
    //触发依赖
    trigger(target, propertyKey)
    return res
  }
}
export const mutableHandlers = {
  get,
  set,
}

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
//改写readonlyHandlers
export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
})
