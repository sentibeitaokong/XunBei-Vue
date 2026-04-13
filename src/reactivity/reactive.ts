import {mutableHandlers,readonlyHandlers,shallowReadonlyHandlers} from "./baseHandlers.ts";
import {isObject} from "../shared";

export const enum ReactiveFlags{
    IS_REACTIVE='__v_isReactive',
    IS_READONLY='__v_isReadonly',
}

export function reactive(raw: any) {
    return createReactiveObject(raw, mutableHandlers)
}

//readonly方法不会收集依赖也不会触发set
export function readonly(raw: any) {
    return createReactiveObject(raw, readonlyHandlers)
}

//shallowReadonly方法只有表层对象不会收集依赖也不会触发set
export function shallowReadonly(raw: any) {
    return createReactiveObject(raw, shallowReadonlyHandlers)
}

//创建一个响应式的对象
function createReactiveObject(target: any,baseHandlers:any) {
    if(!isObject(target)){
        console.warn(`target :"${target}"必须是一个对象`);
        return target
    }
    return new Proxy(target, baseHandlers)
}

//检查一个对象是否是由 reactive() 或 shallowReactive() 创建的代理。
export function isReactive(value:any) {
    //执行取值操作触发get方法
    return !!value[ReactiveFlags.IS_REACTIVE]
}

//检查传入的值是否为只读对象。只读对象的属性可以更改，但他们不能通过传入的对象直接赋值。
// 通过 readonly() 和 shallowReadonly() 创建的代理都是只读的，类似于没有 set 函数的 computed() ref。
export function isReadonly(value:any) {
    //执行取值操作触发get方法
    return !!value[ReactiveFlags.IS_READONLY]
}

//检查一个对象是否是由 reactive()、readonly()、shallowReactive() 或 shallowReadonly() 创建的代理。
export function isProxy(value:any) {
    return isReadonly(value)||isReactive(value)
}