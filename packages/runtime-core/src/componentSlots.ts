import {ShapeFlags} from "../../shared/src/ShapeFlags.ts";

export function initSlots(instance:any, children:any){
    //slots 是插槽就处理
    const {vnode}=instance
    if(vnode.ShapeFlag&ShapeFlags.SLOT_CHILDREN){
        normalizeObjectSlots(children,instance.slots)
    }
}

//转换类型为object插槽
function normalizeObjectSlots(children:any,slots:any){
    //保证slots返回的是一个数组 方便渲染
    for(const key in children){
        const value=children[key]
        slots[key]=(props:any)=>normalizeSlotValue(value(props))
    }
}
//转换插槽内容为数组
function normalizeSlotValue(value:any){
    return Array.isArray(value)?value:[value]
}