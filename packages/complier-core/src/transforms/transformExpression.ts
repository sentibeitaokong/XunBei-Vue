import {NodeTypes} from "../ast.ts";

//转换表达式  给表达式输出添加_ctr.      {{message}} -> _ctr.message
export function transformExpression(node: any) {
    if (node.type === NodeTypes.INTERPOLATION) {
        node.content = processExpression(node.content)
    }
}

function processExpression(node: any) {
    node.content = `_ctx.${node.content}`
    return node
}