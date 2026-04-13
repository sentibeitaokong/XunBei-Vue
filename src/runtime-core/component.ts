import {initProps} from "./componentProps.ts"
//组件实例属性
import {PublicInstanceProxyHandlers} from "./componentPublicInstance.ts";
import {shallowReadonly} from "../reactivity/reactive.ts";
import {emit} from "./componentEmits.ts";
import {initSlots} from "./componentSlots.ts";

export  function createComponentInstance(vnode:any,parent:any){
    console.log('parentComponent',parent)
    const component={
        vnode,
        type:vnode.type, //vnode类型
        setupState:{},  //setup方法里面返回的属性
        props:{},
        slots:{},
        provides:parent?parent.provides:{},    //provide数据
        parent,      //父组件 vnode
        emit:()=>{}
    };
    //初始化赋值
    component.emit=emit.bind(null,component) as any
    return component
}
//初始化组件
export function setupComponent(instance:any){
    //TODO 初始化props和初始化slots
    initProps(instance,instance.vnode.props)
    initSlots(instance,instance.vnode.children)
    //初始化有状态的组件
    setupStatefulComponent(instance);
}

function setupStatefulComponent(instance:any){
    //取出组件实例中虚拟节点的type属性
    const Component=instance.type;

    //ctx 使用Proxy代理，提取虚拟dom上setup方法返回的属性值
    instance.proxy=new Proxy({_:instance},PublicInstanceProxyHandlers)

    //取出组件实例中的setup属性
    const {setup}=Component
    if(setup){
        //获取当前组件实例
        setCurrentInstance(instance)

        //setup方法有function和object两种返回值
        //1.function直接作为render函数渲染组件
        //2.object 则直接充当组件实例中的属性

        //获取setup中的返回值,浅层次props的值不可修改
        const setupResult=setup(shallowReadonly(instance.props),{emit:instance.emit})
        //重置状态
        setCurrentInstance(null)
        handleSetupResult(instance,setupResult)
    }
}

function handleSetupResult(instance:any,setupResult:any){
    //function object
    //TODO function
    if(typeof setupResult==='object'){
        //将setup返回的Object对象直接赋值给组件实例的属性对象中
        instance.setupState=setupResult;
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance:any){
    //获取组件的vnode
    const Component=instance.type
    if(Component.render){
        instance.render=Component.render
    }
}

let currentInstance:any=null

export function getCurrentInstance(){
    return currentInstance
}
//可追溯赋值过程,方便维护
export function setCurrentInstance(instance:any){
    currentInstance=instance
}