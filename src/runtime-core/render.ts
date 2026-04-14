import {createComponentInstance, setupComponent} from "./component.ts";
import {ShapeFlags} from "../shared/ShapeFlags.ts";
import {Fragement, Text} from "./vnode.ts";
import {createAppAPI} from "./createApp.ts";
import {effect} from "../reactivity/effect.ts";
import {EMPTY_OBJ} from "../shared";


export function createRenderer(options:any) {
    const {
        createElement:hostCreateElement,
        patchProp:hostPatchProp,
        insert:hostInsert,
        remove:hostRemove,
        setElementText:hostSetElementText
    }=options

    //渲染
    function render(vnode: any, container: any) {
        //patch
        patch(null,vnode, container, null,null)
    }

    //处理节点  n1为老的vnode节点，n2为新的vnode节点
    function patch(n1:any,n2: any, container: any, parentComponent: any,anchor:any) {
        //ShapeFlags
        //vnode->flag  标识虚拟节点的类型

        //TODO判断vnode是不是一个element
        //是element就处理element
        const {type, ShapeFlag} = n2
        //Fragment->只渲染children
        //根据虚拟节点的类型进行判断
        switch (type) {
            case Fragement:
                //渲染插槽或者template模版
                processFragment(n1,n2, container, parentComponent,anchor)
                break;
            case Text:
                //渲染无标签的节点
                processText(n1,n2, container)
                break;
            default:
                //渲染组件和正常标签的节点
                //位运算a&b  表示b是否满足a的条件
                if (ShapeFlag & ShapeFlags.ELEMENT) {
                    //处理element
                    processElement(n1,n2, container, parentComponent,anchor)
                } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    //去处理组件
                    processComponent(n1,n2, container, parentComponent,anchor)
                }
                break
        }
    }

    //处理Fragment  只渲染children 渲染插槽和template里面的数据
    function processFragment(n1:any,n2: any, container: any, parentComponent: any,anchor:any) {
        mountChildren(n2.children, container, parentComponent,anchor)
    }

    //处理无标签的节点
    function processText(n1:any,n2: any, container: any) {
        const {children} = n2
        //存储该组件实例管理的 DOM 根节点。
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    //处理组件
    function processComponent(n1:any,n2: any, container: any, parentComponent: any,anchor:any) {
        mountComponent(n2, container, parentComponent,anchor)
    }

    //处理element
    function processElement(n1:any,n2: any, container: any, parentComponent: any,anchor:any) {
        if(!n1){
            mountElement(n2, container, parentComponent,anchor)
        }else{
            patchElement(n1,n2,container,parentComponent,anchor)
        }
    }

    function patchElement(n1:any,n2:any,container:any,parentComponent:any,anchor:any){
        //新旧节点对比
        //获取el n2在初始化的时候可能没有值,直接将n1.el赋值给n2.el
        const el=(n2.el=n1.el)
        //props
        const oldProps=n1.props||EMPTY_OBJ
        const newProps=n2.props||EMPTY_OBJ
        console.log('patchComponent')
        console.log('n1:',n1,"n2:",n2)
        patchProps(el,oldProps,newProps)

        //children
        patchChildren(n1,n2,el,parentComponent,anchor)
    }
    //比对新旧props
    //1.新老props不相同且都有值，直接更新props
    //2.新props为null和undefined，直接删除老的props
    //3.新props里面没有老props的某个值，直接把这个值从props里面删除
    function patchProps(el:any,oldProps:any,newProps:any){
        //老的props和新的props相等不需要去比对
        if(oldProps!==newProps){
            //遍历新的props，当新旧props不一致就调用hostPatchprop方法更新props
            for(const key in newProps){
                const prevProp=oldProps[key]
                const nextProp=newProps[key]
                if(prevProp!==nextProp){
                    hostPatchProp(el,key,prevProp,nextProp)
                }
            }
            //老的props不是空对象才需要遍历老的props
            if(oldProps!==EMPTY_OBJ){
                //遍历老的props，当老props的值不在新的props中，说明这个props需要被删除
                for(const key in oldProps){
                    if(!(key in newProps)){
                        hostPatchProp(el,key,oldProps[key],null)
                    }
                }
            }
        }
    }

    function patchChildren(n1:any,n2:any,container:any,parentComponent:any,anchor:any){
        //新旧的vnode类型
        const prevShapeFlag=n1.ShapeFlag
        const nextShapeFlag=n2.ShapeFlag
        //获取老新vnode的子节点信息
        const c1:any=n1.children
        const c2:any=n2.children
        //vnode节点有文本和数组两种类型，因此比对节点有四种情况
        //1.当新vnode节点是文本类型
        if(nextShapeFlag&ShapeFlags.TEXT_CHILDREN){
            //老vnode节点是数组类型
            if(prevShapeFlag&ShapeFlags.ARRAY_CHILDREN){
                //1.把老vnode节点的children清空  2.将新节点设置成c2
                unmountChildren(n1.children)
                //直接设置新vnode节点为c2
                hostSetElementText(container,c2)
            }else{
                //老节点是文本类型,直接将新节点设置成c2
                if(c1!==c2){
                    //直接设置新vnode节点为c2
                    hostSetElementText(container,c2)
                }
            }
        }else{
            //新节点是个文本节点
            //1.直接清空旧节点的值
            if(prevShapeFlag&ShapeFlags.TEXT_CHILDREN){
                hostSetElementText(container,'')
                mountChildren(c2,container,parentComponent,anchor)
            }else{
                //新老节点都是数组类型 diff算法 双端对比
                patchKeyedChildren(c1,c2,container,parentComponent,anchor)
            }
        }
    }
    function unmountChildren(children:any){
        //遍历children获取每个子节点的根节点，然后调用hostRemove方法删除这些节点
        for(let i=0;i<children.length;i++){
            const el=children[i].el
            //remove
            hostRemove(el)
        }
    }

    function patchKeyedChildren(c1:any,c2:any,container:any,parentComponent:any,parentAnchor:any){
        let i:number=0
        let e1:number=c1.length-1
        let e2:number=c2.length-1
        function isSameVnodeType(n1:any,n2:any){
            //比对type和key  都相同则默认是一样的节点,才使用patch去更新数据
            return n1.type===n2.type&&n1.key===n2.key

        }
        //1.左侧比对  i 是循环起始下标  e1 和 e2 是老节点和新节点最后的索引下标
        while(i<=e1&&i<=e2){
            //取出vnode
            const n1:any=c1[i]
            const n2:any=c2[i]
            if(isSameVnodeType(n1,n2)){
                patch(n1,n2,container,parentComponent,parentAnchor)
            }else{
                break;
            }
            i++;
        }
        //2.右侧比对
        while(i<=e1&&i<=e2){
            //取出vnode
            const n1:any=c1[e1]
            const n2:any=c2[e2]
            if(isSameVnodeType(n1,n2)){
                patch(n1,n2,container,parentComponent,parentAnchor)
            }else{
                break;
            }
            e1--
            e2--
        }
        //3.新的vnode节点比老的vnode节点多  当i走到e1节点索引后面并且小于等于e2节点索引，说明现在的c2[i]节点需要添加进去
        if(i>e1){
            if(i<=e2){
                //i+1<c2.length 说明需要添加节点在左侧，反之是需要添加节点在右侧
                const nextPos=i+1
                const anchor=i+1<c2.length?c2[nextPos].el:null
                patch(null,c2[i],container,parentComponent,anchor)
            }
        }
    }

    //挂载element
    function mountElement(vnode: any, container: any, parentComponent: any,anchor:any) {
        //存储该组件实例管理的 DOM 根节点。
        const el = (vnode.el = hostCreateElement(vnode.type))
        //处理element 子节点

        //子节点 string array
        const {children, ShapeFlag} = vnode
        if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children
        } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent,anchor)
        }

        //props
        const {props} = vnode
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el,key,null,val)
        }
        hostInsert(el,container,anchor)
    }

    function mountChildren(children: any, container: any, parentComponent: any,anchor:any) {
        //vnode  多个虚拟节点需要判断子节点是否是组件还是element
        children.forEach((v: any) => {
            //再次判断子节点是否是组件还是element
            patch(null,v, container, parentComponent,anchor)
        })
    }

    //挂载组件实例 initialVnode 初始化虚拟节点
    function mountComponent(initialVnode: any, container: any, parentComponent: any,anchor:any) {
        //创建组件实例
        const instance = createComponentInstance(initialVnode, parentComponent)
        //初始化组件
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container,anchor)
    }

    //处理组件虚拟dom vnode的渲染
    function setupRenderEffect(instance: any, initialVnode: any, container: any,anchor:any) {
        //添加effect主要原因是当响应式对象变更的时候，可以监听到然后调用render函数生成新的vnode进行diff算法
        effect(()=>{
           if(!instance.isMounted){
               console.log('init')
               const {proxy} = instance
               //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
               //因此可以直接使用this获取instace中setupState属性中的数据
               //instance.subTree存一下上一个vnode
               const subTree = (instance.subTree=instance.render.call(proxy))
               //vnode->patch
               //vnode->element->mountElement
               patch(null,subTree, container, instance,anchor)

               //element->mount 当所有element节点都挂载以后 获取根节点
               initialVnode.el = subTree.el
               instance.isMounted=true
           }else{
               console.log('update')
               const {proxy} = instance
               //新的vnode
               const subTree = instance.render.call(proxy)
               //上一个vnode
               const previousSubTree=instance.subTree
               instance.subTree=subTree
               patch(previousSubTree,subTree, container, instance,anchor)
           }
        })
    }
    return {
        createApp:createAppAPI(render)
    }
}