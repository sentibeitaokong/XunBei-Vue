//root 根节点  options转换器
import {NodeTypes} from "./ast.ts";
import {TO_DISPLAY_STRING} from "./runtimeHelpers.ts";

export function transform(root: any, options: any = {}): any {
    //将root的options和root本身合并
    const context = createTransformContext(root, options);
    //1.遍历：深度优先搜索
    //2.修改text的content
    traverseNode(root, context)
    //root.codegenNode 将数据提取到root.codegenNode中
    createRootCodegen(root)
    //取出所有函数参数
    root.helpers = [...context.helpers.keys()]
}

function createRootCodegen(root: any) {
    const child = root.children[0]
    //如果是element类型，就取当前节点的codegenNode属性作为root的codegenNode
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode
    } else {
        root.codegenNode = root.children[0]
    }
}

function createTransformContext(root: any, options: any): any {
    const context = {
        root,
        //ast转换方法
        nodeTransforms: options.nodeTransforms || [],
        //存储函数的参数
        helpers: new Map(),
        helper(key: any) {
            context.helpers.set(key, 1)
        }
    }
    return context;
}

function traverseNode(node: any, context: any): any {
    //深度优先遍历
    //取出nodeTransforms  遍历里面的转换方法并执行，那么通过深度优先遍历，实现将指定或者所有node节点逻辑转换，
    const nodeTransforms = context.nodeTransforms
    //推出插件的方法数组
    const exitFns:any=[]
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i]
        const onExit=transform(node, context)
        //收集起来
        if(onExit) exitFns.push(onExit)
    }
    //根据不同类型进行不同的处理
    switch (node.type) {
        //表达式
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break;
        //Root和标签 需要深度递归遍历子节点
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            transformNode(node, context)
            break
        default:
            break
    }
    //遍历执行推出插件方法
    let i=exitFns.length
    while (i--){
        exitFns[i]();
    }

}

function transformNode(node: any, context: any): any {
    const children: any = node.children
    //遍历node里面的children，深度优先遍历
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i]
            traverseNode(node, context)
        }
    }
}