import {createComponentInstance,setupComponent} from "./component.ts";
import {ShapeFlags} from "../shared/ShapeFlags.ts";

//渲染
export function render(vnode:any,container:any){
    //patch
    patch(vnode,container)
}
//处理节点
function patch(vnode:any,container:any){
    //ShapeFlags
    //vnode->flag  标识虚拟节点的类型

    //TODO判断vnode是不是一个element
    //是element就处理element
   const {ShapeFlag}=vnode
    //位运算a&b  表示b是否满足a的条件
    if(ShapeFlag&ShapeFlags.ELEMENT){
        //处理element
        processElement(vnode,container)
    }else if(ShapeFlag&ShapeFlags.STATEFUL_COMPONENT){
        //去处理组件
        processComponent(vnode,container)
    }

}
//处理组件
function  processComponent(vnode:any,container:any){
    mountComponent(vnode,container)
}

//处理element
function  processElement(vnode:any,container:any){
    mountElement(vnode,container)
}

//挂载element
function mountElement(vnode:any,container:any){
    //存储该组件实例管理的 DOM 根节点。
    const el=(vnode.el=document.createElement(vnode.type))
    //处理element 子节点

    //子节点 string array
    const {children,ShapeFlag}=vnode
    if(ShapeFlag&ShapeFlags.TEXT_CHILDREN){
        el.textContent=children
    }else if(ShapeFlag&ShapeFlags.ARRAY_CHILDREN){
        mountChildren(vnode,el)
    }

    //props
    const {props}=vnode
    for (const key in props){
        const val=props[key]
        el.setAttribute(key,val)
    }
    container.append(el)
}

function mountChildren(vnode:any,container:any){
    //vnode  多个虚拟节点需要判断子节点是否是组件还是element
    vnode.children.forEach((v:any)=>{
        //再次判断子节点是否是组件还是element
        patch(v,container)
    })
}

//挂载组件实例 initialVnode 初始化虚拟节点
function mountComponent(initialVnode:any,container:any){
    //创建组件实例
    const instance=createComponentInstance(initialVnode)
    //初始化组件
    setupComponent(instance);
    setupRenderEffect(instance,initialVnode,container)
}
//处理组件虚拟dom vnode的渲染
function setupRenderEffect(instance:any,initialVnode:any,container:any){
    const {proxy}=instance
    //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
    //因此可以直接使用this获取instace中setupState属性中的数据
    const subTree=instance.render.call(proxy)
    //vnode->patch
    //vnode->element->mountElement
    patch(subTree,container)

    //element->mount 当所有element节点都挂载以后 获取根节点
    initialVnode.el=subTree.el
}