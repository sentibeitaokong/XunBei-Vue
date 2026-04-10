import {createVNode} from "./vnode.ts";
import {render} from "./render.ts";

export function createApp(rootComponent:any){
    return {
        mount(rootContainer:any){
            //先转换虚拟节点vnode
            //component->vnode
            //所有的逻辑都基于vnode进行处理

            //组件转换成虚拟节点
            const vnode=createVNode(rootComponent)
            //渲染虚拟节点到容器中
            render(vnode,rootContainer)
        }
    }
}