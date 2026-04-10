//组件实例属性
import {PublicInstanceProxyHandlers} from "./componentPublicInstance.ts";

export  function createComponentInstance(vnode:any){
    const component={
        vnode,
        type:vnode.type,
        setupState:{},
    };
    return component
}
//初始化组件
export function setupComponent(instance:any){
    //TODO
    //initProps
    //initSlots

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
        //setup方法有function和object两种返回值
        //1.function直接作为render函数渲染组件
        //2.object 则直接充当组件实例中的属性

        //获取setup中的返回值
        const setupResult=setup()

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