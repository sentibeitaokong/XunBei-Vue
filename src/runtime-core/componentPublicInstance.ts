//便于处理其他属性
const PublicPropertiesMap:any={
    $el:(i:any)=>i.vnode.el
}

export const PublicInstanceProxyHandlers={
    get({_:instance}:any,key:any){
        //setupState
        const {setupState}=instance
        if(key in setupState){
            return setupState[key]
        }
        //key -> $el   如果是通过$el去取值
        const publicGetter=PublicPropertiesMap[key]
        if(publicGetter){
            return publicGetter(instance)
        }
    }
}