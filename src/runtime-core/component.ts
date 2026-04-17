import {initProps} from "./componentProps.ts"
//组件实例属性
import {PublicInstanceProxyHandlers} from "./componentPublicInstance.ts";
import {shallowReadonly} from "../reactivity/reactive.ts";
import {emit} from "./componentEmits.ts";
import {initSlots} from "./componentSlots.ts";
import {proxyRefs} from "../reactivity";

//创建组件实例 组件实例里面包含当前的虚拟节点vnode已经其他一些属性
export  function createComponentInstance(vnode:any,parent:any){
    const component={
        vnode,
        type:vnode.type, //vnode类型
        next:null,      //下一个更新的vnode
        setupState:{},  //setup方法里面返回的属性
        props:{},
        slots:{},
        provides:parent?parent.provides:{},    //provide数据
        parent,      //父组件 vnode
        isMounted:false,
        subTree:{},    ///记录上一个vnode节点
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
        instance.setupState=proxyRefs(setupResult);
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance:any){
    //获取组件的vnode
    const Component=instance.type
    if(compiler&&!Component.render){
        if(Component.template){
            //这里的compiler方法就是render方法，在XunBei-vue出口调用时，通过调用这个文件的方法，把render函数赋值给了compiler方法
            Component.render=compiler(Component.template)
        }
    }
    instance.render=Component.render
}

let currentInstance:any=null

export function getCurrentInstance(){
    return currentInstance
}
//可追溯赋值过程,方便维护
export function setCurrentInstance(instance:any){
    currentInstance=instance
}

//在XunBei-vue出口调用  将render函数赋值给compiler
let compiler:any;

export function registerRuntimeCompiler(_compiler:any){
    compiler=_compiler
}