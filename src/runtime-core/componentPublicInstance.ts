import {hasOwn} from "../shared";
//便于处理其他属性
const PublicPropertiesMap:any={
    $el:(i:any)=>i.vnode.el,
    $slots:(i:any)=>i.slots,
    $props:(i:any)=>i.props,
}

export const PublicInstanceProxyHandlers={
    get({_:instance}:any,key:any){
        //setupState
        const {setupState,props}=instance

        //判断key的属性是否在props里面，在的话直接返回
        if(hasOwn(setupState,key)){
            return setupState[key]
        }else if(hasOwn(props,key)){
            return props[key]
        }

        //key -> $el   如果是通过$el去取值
        const publicGetter=PublicPropertiesMap[key]
        if(publicGetter){
            return publicGetter(instance)
        }
    }
}