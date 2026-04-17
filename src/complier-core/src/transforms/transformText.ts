import {NodeTypes} from "../ast.ts";
import {isTextNode} from "../utils.ts";

//复合类型 包含插值和文本 hi,{{message}}
export function transformText(node:any){
    //当文本和插值相邻时，添加一个+号在两者之间
    if(node.type===NodeTypes.ELEMENT){
        return ()=>{
            let  currentContainer
            const {children} = node;
            for(let i=0;i<children.length;i++){
                const child=children[i];
                if(isTextNode(child)){
                    for(let j=i+1; j<children.length;j++){
                        const nextNode=children[j];
                        if(isTextNode(nextNode)){
                            if(!currentContainer){
                                currentContainer=children[i]={
                                    type:NodeTypes.COMPOUND_EXPRESSION,
                                    children:[child]
                                }
                            }
                            currentContainer.children.push(' + ')
                            currentContainer.children.push(nextNode);
                            //推进节点  删除节点
                            children.splice(j,1);
                            //删除了节点，指针会前进一位，将指针回调
                            j--;
                        }else{
                            currentContainer=undefined
                            break
                        }
                    }
                }
            }
        }
    }
}