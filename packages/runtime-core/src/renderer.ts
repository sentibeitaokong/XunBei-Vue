import {createComponentInstance, setupComponent} from "./component.ts";
import {ShapeFlags} from "../../shared/src/ShapeFlags.ts";
import {Fragement, Text} from "./vnode.ts";
import {createAppAPI} from "./createApp.ts";
import {effect} from "../../reactivity/src/effect.ts";
import {EMPTY_OBJ} from "../../shared/src";
import {shouldUpdateComponent} from "./componentUpdateUtils.ts";
import {queueJobs} from "./scheduler.ts";


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
        console.log('oldFragment',n1)
        mountChildren(n2.children, container, parentComponent,anchor)
    }

    //处理无标签的节点
    function processText(n1:any,n2: any, container: any) {
        console.log('oldText',n1)
        const {children} = n2
        //存储该组件实例管理的 DOM 根节点。
        const textNode = (n2.el = document.createTextNode(children))
        container.append(textNode)
    }

    //处理组件
    function processComponent(n1:any,n2: any, container: any, parentComponent: any,anchor:any) {
        if(!n1){
            //初始化组件
            mountComponent(n2, container,parentComponent,anchor)
        }else{
            //更新组件
            updateComponent(n1,n2)
        }
    }
    function updateComponent(n1:any,n2:any){
        debugger
        if(shouldUpdateComponent(n1,n2)){
            //获取组件实例
            const instance=(n2.component=n1.component)
            //添加更新后的组件实例
            instance.next=n2
            //更新组件实例
            instance.update()
        }else{
            const instance=(n2.component=n1.component)
            n2.el=n1.el
            instance.vnode=n2
        }
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
        console.log('patchElement container',container)
        //新旧节点对比
        //获取el n2在初始化的时候可能没有值,直接将n1.el赋值给n2.el
        const el=(n2.el=n1.el)
        //props
        const oldProps=n1.props||EMPTY_OBJ
        const newProps=n2.props||EMPTY_OBJ
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
    //删除节点
    function unmountChildren(children:any){
        //遍历children获取每个子节点的根节点，然后调用hostRemove方法删除这些节点
        for(let i=0;i<children.length;i++){
            const el=children[i].el
            //remove
            hostRemove(el)
        }
    }
    //diff算法
    function patchKeyedChildren(c1:any,c2:any,container:any,parentComponent:any,parentAnchor:any){
        let i:number=0
        let e1:number=c1.length-1
        let e2:number=c2.length-1
        function isSameVnodeType(n1:any,n2:any){
            //比对type和key  都相同则默认是一样的节点,才使用patch去更新数据
            return n1.type===n2.type&&n1.key===n2.key

        }
        //1.左侧比对  i 是循环起始下标  e1 和 e2 是老节点和新节点最后的索引下标  AB(C)->AB(DE)
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
        //2.右侧比对  (A)BC->(DE)BC
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
        //左侧 （AB）->(AB)C  i = 2, e1 = 1, e2 = 2
        //右侧  (AB) -> C(AB)  i = 0, e1 = -1, e2 = 0
        if(i>e1){
            if(i<=e2){
                //i+1<c2.length 说明需要添加节点在左侧，反之是需要添加节点在右侧
                const nextPos=e2+1
                const anchor=nextPos<c2.length?c2[nextPos].el:null
                while(i<=e2){
                    //n1为null 表示是插入操作
                    patch(null,c2[i],container,parentComponent,anchor)
                    i++
                }
            }
        }else if(i>e2){
            //4.老节点比新节点要多
            //左侧   (AB)C->(AB)  i = 2, e1 = 2, e2 = 1
            //右侧   (A)BC->BC  i = 0, e1 = 0, e2 = -1
            while (i<=e1){
                hostRemove(c1[i].el)
                i++
            }
        }else{
            //乱序 中间对比
            // a,b,(c,e,d),f,g -> a,b,(e,c),f,g
            // 新老节点长度相同左右侧节点相同，中间节点不同
            // s2 新节点起始下标索引
            let s1:number=i
            let s2:number=i
            //需要patch的节点数量
            const toBePatched=e2-s2+1
            //已经patch完的节点数量
            let patched:number=0
            //定义Map方便查找key
            const keyToNewIndexMap=new Map()
            //设置一个需要patch节点数量的数组 并初始化内部内容全为0
            const newIndexToOldIndexMap=new Array(toBePatched).fill(0)
            //记录是否需要移动
            let moved=false
            let maxNewIndexSoFar=0
            //遍历新节点中间的节点key映射到map里
            for(let i:number=s2;i<=e2;i++){
                const nextChild:any=c2[i]
                keyToNewIndexMap.set(nextChild.key,i)
            }
            //遍历老节点
            for(let i:number=s1;i<=e1;i++){
                const prevChild:any=c1[i]
                //当已经处理的节点大于等于需要处理的节点，说明剩下的节点全是多余的节点，就需要直接删除
                if(patched>=toBePatched){
                    hostRemove(prevChild.el)
                    continue
                }
                //null undefined
                let newIndex;
                //当老节点的key有值时，去新的节点里面查找它的索引，然后对比新老节点变化
                if(prevChild.key!=null){
                    newIndex=keyToNewIndexMap.get(prevChild.key)
                }else{
                    //当老节点没有key时，遍历新节点对比老节点查找相同类型相同且都没有key
                    for (let j:number=s2;j<=e2;j++){
                        if(isSameVnodeType(prevChild,c2[j])){
                            newIndex=j
                            break
                        }
                    }
                }
                //如果遍历老节点没找到新节点的NewIndex，说明老节点多余了就需要删除，否则patch方法去比对变化
                if(newIndex===undefined){
                    hostRemove(prevChild.el)
                }else{
                    //cde-> newIndex->120 ->ecd
                    //当新节点的索引不大于之前节点的索引 说明需要移动
                    // 相当于判断新节点是不是依次递增的索引表明新节点每个节点整体前后位置没有变化
                    if(newIndex>=maxNewIndexSoFar){
                        maxNewIndexSoFar=newIndex
                    }else{
                        moved=true
                    }
                    //i+1 是避免当i=0时，这个时候还没有创建映射，newIndexToOldIndexMap默认内容为0，判断会有问题
                    newIndexToOldIndexMap[newIndex-s2]=i+1;
                    patch(prevChild,c2[newIndex],container,parentComponent,null)
                    //递增已经处理的节点数量
                    patched++
                }
            }
            //移动位置 a,b,(c,d,e),f,g  -> a,b,(e,c,d),f,g
            const increasingNewIndexSequence=moved?getSequence(newIndexToOldIndexMap):[]
            let j:number=increasingNewIndexSequence.length-1
            //倒序遍历，根据右侧稳定的节点作锚点进行循环插入  AB(CDE)FG->AB(ECD)FG
            for(let i=toBePatched-1;i>=0;i--){
                //获取中间节点的最后一个节点下标和起始节点
                const nextIndex=i+s2
                const nextChild=c2[nextIndex]
                const anchor=nextIndex+1<c2.length?c2[nextIndex+1].el:null
                //当newIndexToOldIndexMap[i]===0说明这个新的节点没有在老节点中找到，则需要创建一个新节点
                if(newIndexToOldIndexMap[i]===0){
                    patch(null,nextChild,container,parentComponent,anchor)
                }else if(moved){
                    //递增序列返回的索引和原始节点的索引进行对比
                    // cde->012  ecd->12  e移动到c前面则 cd索引相同不需要移动
                    //如果两者索引不同则说明原始节点当前索引的节点需要移动
                    if(j<0||i!==increasingNewIndexSequence[j]){
                        //移动位置
                        hostInsert(nextChild.el,container,anchor)
                    }else{
                        j--
                    }
                }
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

        //初始化props
        const {props} = vnode
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el,key,null,val)
        }
        //往anchor锚点前 插入el节点
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
        const instance =(initialVnode.component= createComponentInstance(
            initialVnode,
            parentComponent))
        //初始化组件props和slot等属性
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container,anchor)
    }

    //处理组件虚拟dom vnode的渲染
    function setupRenderEffect(instance: any, initialVnode: any, container: any,anchor:any) {
        //添加effect主要原因是当响应式对象变更的时候，可以监听到然后调用render函数生成新的vnode进行diff算法
        //更新依赖的方法赋值给组件实例对象的update属性
        instance.update=effect(()=>{
            if(!instance.isMounted){
                console.log('init')
                const {proxy} = instance
                //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
                //因此可以直接使用this获取instace中setupState属性中的数据
                //instance.subTree存一下上一个vnode
                const subTree = (instance.subTree=instance.render.call(proxy,proxy))
                //vnode->patch
                //vnode->element->mountElement
                patch(null,subTree, container, instance,anchor)

                //element->mount 当所有element节点都挂载以后 获取根节点
                initialVnode.el = subTree.el
                instance.isMounted=true
            }else{
                debugger
                console.log('update')
                //更新组件props 取出当前以及需要更新后的组件实例
                const {next,vnode}=instance
                //当组件实例有新的需要更新的vnode
                if(next){
                    next.el=vnode.el
                    //更新组件实例属性
                    updateComponentPreRender(instance,next)
                }
                const {proxy} = instance
                //新的vnode
                const subTree = instance.render.call(proxy,proxy)
                //上一个vnode
                const previousSubTree=instance.subTree
                instance.subTree=subTree
                patch(previousSubTree,subTree, container, instance,anchor)
            }
        },{
            scheduler(){
                console.log('update scheduler')
                //将多个需要更新的操作塞入一个队列，然后一次性更新
                queueJobs(instance.update)
            }
        })
    }

    return {
        createApp:createAppAPI(render)
    }
}
//更新组件实例属性
function updateComponentPreRender(instance:any,nextVnode:any){
    //1.将新的vnode赋值给组件的vnode  2.将组件实例的next属性赋值为空 3.将新的vnode的props属性赋值给组件实例的props属性
    instance.vnode=nextVnode
    instance.next=null
    instance.props=nextVnode.props
}
//最大递增序列  返回递增序列的下标 例：[2,3,4,1,5]    返回[2,3,4,5]的下标[0,1,2,4]
function getSequence(arr:any) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}