import {CREATE_ELEMENT_VNODE} from "./runtimeHelpers.ts";

export const enum NodeTypes {
    INTERPOLATION,      //插值
    SIMPLE_EXPRESSION,  //插值里面的变量
    ELEMENT,            //标签
    TEXT,               //普通文本
    ROOT,               //根节点
    COMPOUND_EXPRESSION,  //复合类型
}

export function createVnodeCall(context:any,tag:any,props:any,children:any){
    context.helper(CREATE_ELEMENT_VNODE)
    return {
        type:NodeTypes.ELEMENT,
        tag,
        props,
        children
    }
}