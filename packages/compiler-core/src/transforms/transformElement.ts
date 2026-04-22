import {createVnodeCall, NodeTypes} from "../ast.ts";

export function transformElement(node: any, context: any) {
    if (node.type === NodeTypes.ELEMENT) {
        return ()=>{

            //中间处理层

            //tag
            const vnodeTag=`'${node.tag}'`

            //props
            let vnodeProps

            //children
            const {children} = node
            let vnodeChildren=children[0]
            //返回节点所有tag,props,children属性
            node.codegenNode=createVnodeCall(context,vnodeTag,vnodeProps,vnodeChildren)
        }
    }
}