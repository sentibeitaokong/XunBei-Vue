//创建虚拟节点
import {ShapeFlags} from "../shared/ShapeFlags.ts";

export function createVNode(type:any, props?:any, children?:any) {
    const vnode={
        type,
        props,
        children,
        ShapeFlag:getShapeFlag(type),
        el:null
    };
    //位运算 a｜b  同时满足ab两种条件
    if(typeof children==='string'){
        vnode.ShapeFlag|=ShapeFlags.TEXT_CHILDREN
    }else if(Array.isArray(children)){
        vnode.ShapeFlag|=ShapeFlags.ARRAY_CHILDREN
    }
    return vnode
}

function getShapeFlag(type:any){
    return typeof type==='string'? ShapeFlags.ELEMENT :ShapeFlags.STATEFUL_COMPONENT
}

