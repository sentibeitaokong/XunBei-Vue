import {getCurrentInstance} from "./component.ts";

export function inject(key:any,defaultValue?:any) {
    //取
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        const parentProvides=currentInstance.parent.provides
        if(key in parentProvides){
            return parentProvides[key]
        }else if(defaultValue){
            if(typeof defaultValue==='function'){
                return defaultValue()
            }
            return defaultValue
        }
    }
}

export function provide(key:any, value:any) {
    //存
    //key value 存在组件实例中
    const currentInstance:any = getCurrentInstance()
    if(currentInstance){
        let  {provides}=currentInstance
        const parentProvides=currentInstance.parent.provides
        //当前的provides等于父节点的provides的时候说明是刚初始化，
        //provides优先取当前的provides，取不到就取父节点的provides,原型链继承，当前操作仅在组件初始化的时候执行
        if(provides===parentProvides){
            provides=currentInstance.provides=Object.create(parentProvides)
        }
        provides[key]=value
    }
}