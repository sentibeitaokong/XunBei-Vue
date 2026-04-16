//root 根节点  options转换器
export function transform(root:any,options:any):any {
    //将root的options和root本身合并
    const context=createTransformContext(root,options);
    //1.遍历：深度优先搜索
    traverseNode(root,context)
    //2.修改text的content
}
function createTransformContext(root:any,options:any):any {
    const context={
        root,
        nodeTransforms: options.nodeTransforms || [],
    }
    return context;
}

function traverseNode(node:any,context:any):any {
    //深度优先遍历
    //取出nodeTransforms  遍历里面的转换方法并执行，那么通过深度优先遍历，实现将指定或者所有node节点逻辑转换，
   const nodeTransforms=context.nodeTransforms
    for(let i=0;i<nodeTransforms.length;i++){
        const transform=nodeTransforms[i]
        transform(node)
    }
    transformNode(node,context)
}

function transformNode(node:any,context:any):any {
    const children:any=node.children
    //遍历node里面的children，深度优先遍历
    if(children){
        for(let i=0;i<children.length;i++){
            const node=children[i]
            traverseNode(node,context)
        }
    }
}