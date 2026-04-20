import {NodeTypes} from "./ast.ts";
//判断 是否是文本和插槽类型
export  function isTextNode(node:any){
    return (
        node.type===NodeTypes.TEXT||node.type===NodeTypes.INTERPOLATION
    )
}