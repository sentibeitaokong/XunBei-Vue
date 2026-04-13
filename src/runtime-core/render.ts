import {createComponentInstance, setupComponent} from "./component.ts";
import {ShapeFlags} from "../shared/ShapeFlags.ts";
import {Fragement,Text} from "./vnode.ts";

//渲染
export function render(vnode: any, container: any) {
    //patch
    patch(vnode, container,null)
}

//处理节点
function patch(vnode: any, container: any,parentComponent:any) {
    //ShapeFlags
    //vnode->flag  标识虚拟节点的类型

    //TODO判断vnode是不是一个element
    //是element就处理element
    const {type, ShapeFlag} = vnode
    //Fragment->只渲染children
    //根据虚拟节点的类型进行判断
    switch (type) {
        case Fragement:
            //渲染插槽或者template模版
            processFragment(vnode, container,parentComponent)
            break;
        case Text:
            //渲染无标签的节点
            processText(vnode, container)
            break;
        default:
            //渲染组件和正常标签的节点
            //位运算a&b  表示b是否满足a的条件
            if (ShapeFlag & ShapeFlags.ELEMENT) {
                //处理element
                processElement(vnode, container,parentComponent)
            } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                //去处理组件
                processComponent(vnode, container,parentComponent)
            }
            break
    }
}

//处理Fragment  只渲染children 渲染插槽和template里面的数据
function processFragment(vnode:any,container:any,parentComponent:any){
    mountChildren(vnode,container,parentComponent)
}

//处理无标签的节点
function processText(vnode: any, container: any) {
    const {children}=vnode
    //存储该组件实例管理的 DOM 根节点。
    const textNode=(vnode.el = document.createTextNode(children))
    container.append(textNode)
}

//处理组件
function processComponent(vnode: any, container: any,parentComponent:any) {
    mountComponent(vnode, container,parentComponent)
}

//处理element
function processElement(vnode: any, container: any,parentComponent:any) {
    mountElement(vnode, container,parentComponent)
}

//挂载element
function mountElement(vnode: any, container: any,parentComponent:any) {
    //存储该组件实例管理的 DOM 根节点。
    const el = (vnode.el = document.createElement(vnode.type))
    //处理element 子节点

    //子节点 string array
    const {children, ShapeFlag} = vnode
    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children
    } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el,parentComponent)
    }

    //props
    const {props} = vnode
    for (const key in props) {
        const val = props[key]
        //on+Event name 就是点击事件 小写event就是事件名
        const isOn = (key: string) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase()
            el.addEventListener(event, val)
        } else {
            el.setAttribute(key, val)
        }
    }
    container.append(el)
}

function mountChildren(vnode: any, container: any,parentComponent:any) {
    //vnode  多个虚拟节点需要判断子节点是否是组件还是element
    vnode.children.forEach((v: any) => {
        //再次判断子节点是否是组件还是element
        patch(v, container,parentComponent)
    })
}

//挂载组件实例 initialVnode 初始化虚拟节点
function mountComponent(initialVnode: any, container: any,parentComponent:any) {
    //创建组件实例
    const instance = createComponentInstance(initialVnode,parentComponent)
    //初始化组件
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container)
}

//处理组件虚拟dom vnode的渲染
function setupRenderEffect(instance: any, initialVnode: any, container: any) {
    const {proxy} = instance
    //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
    //因此可以直接使用this获取instace中setupState属性中的数据
    const subTree = instance.render.call(proxy)
    //vnode->patch
    //vnode->element->mountElement
    patch(subTree, container,instance)

    //element->mount 当所有element节点都挂载以后 获取根节点
    initialVnode.el = subTree.el
}