/**
 * @file 组件系统核心 —— 组件实例的创建、初始化和生命周期
 *
 * 负责：
 * 1. 创建组件实例（含 props、slots、provides 等属性）
 * 2. 初始化组件的 setup 函数
 * 3. 处理 setup 返回值（object 或 function）
 * 4. 模板编译的注册
 */

import { initProps } from './componentProps.ts'
import { PublicInstanceProxyHandlers } from './componentPublicInstance.ts'
import { shallowReadonly } from '@xunbei-vue/reactivity'
import { emit } from './componentEmits.ts'
import { initSlots } from './componentSlots.ts'
import { proxyRefs } from '@xunbei-vue/reactivity'

/**
 * 创建一个组件实例。
 *
 * 组件实例是组件的运行时上下文，包含当前 VNode、props、
 * slots、provides、父组件引用、挂载状态和子树的记录。
 *
 * @param vnode - 组件对应的 VNode
 * @param parent - 父组件实例
 * @returns 组件实例对象
 */
export function createComponentInstance(vnode: any, parent: any) {
  const component = {
    /** 当前组件对应的 VNode */
    vnode,
    /** VNode 的类型（即组件对象） */
    type: vnode.type,
    /** 下一次更新时的 VNode */
    next: null,
    /** setup 方法返回的属性 */
    setupState: {},
    /** 组件 props */
    props: {},
    /** 组件插槽 */
    slots: {},
    /** provide 数据（继承自父级） */
    provides: parent ? parent.provides : {},
    /** 父组件 VNode */
    parent,
    /** 是否已挂载 */
    isMounted: false,
    /** 上一个 VNode 节点（用于 diff） */
    subTree: {},
    /** emit 事件发射函数 */
    emit: () => {},
  }
  // 初始化时绑定 emit 的 this 指向为当前组件实例
  component.emit = emit.bind(null, component) as any
  return component
}

/**
 * 初始化组件 —— 依次进行 props 初始化、slots 初始化、
 * 以及有状态组件（setup）的初始化。
 *
 * @param instance - 组件实例
 */
export function setupComponent(instance: any) {
  initProps(instance, instance.vnode.props)
  initSlots(instance, instance.vnode.children)
  setupStatefulComponent(instance)
}

/**
 * 初始化有状态组件 —— 执行 setup 函数。
 *
 * 通过 Proxy 代理将 setup 返回值暴露给 render 函数通过 this 访问。
 * setup 可以返回 object（作为组件状态）或 function（作为 render 函数）。
 */
function setupStatefulComponent(instance: any) {
  const Component = instance.type

  // ctx —— 使用 Proxy 代理，提取虚拟 DOM 上 setup 方法返回的属性值
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)

  const { setup } = Component
  if (setup) {
    // 设置当前组件实例（用于 getCurrentInstance）
    setCurrentInstance(instance)

    // setup 方法有两种返回值：
    // 1. function —— 直接作为 render 函数渲染组件
    // 2. object —— 直接充当组件实例中的属性

    // 向 setup 传入浅层只读的 props 和 emit
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })
    // 重置当前实例
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

/**
 * 处理 setup 的返回值。
 *
 * @param instance - 组件实例
 * @param setupResult - setup 函数的返回值
 */
function handleSetupResult(instance: any, setupResult: any) {
  if (typeof setupResult === 'object') {
    // 将 setup 返回的 Object 对象直接赋值给组件实例的 setupState
    // 使用 proxyRefs 自动解包 ref
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance)
}

/**
 * 完成组件的初始化 —— 处理模板编译和 render 函数绑定。
 */
function finishComponentSetup(instance: any) {
  const Component = instance.type
  // 如果有编译器且组件没有 render 函数但有 template
  if (compiler && !Component.render) {
    if (Component.template) {
      // 调用编译器将 template 转换为 render 函数
      Component.render = compiler(Component.template)
    }
  }
  instance.render = Component.render
}

let currentInstance: any = null

/**
 * 获取当前正在初始化的组件实例。
 *
 * 只能在 setup() 或生命周期函数中调用。
 *
 * @returns 当前组件实例或 null
 */
export function getCurrentInstance() {
  return currentInstance
}

/**
 * 设置当前正在处理的组件实例。
 *
 * 可追溯赋值过程，方便调试和维护。
 *
 * @param instance - 组件实例
 */
export function setCurrentInstance(instance: any) {
  currentInstance = instance
}

/**
 * 运行时编译器 —— 在 XunBei-Vue 出口调用 registerRuntimeCompiler 时被赋值。
 *
 * 用于将 template 字符串编译成 render 函数。
 */
let compiler: any

/**
 * 注册运行时编译器。
 *
 * 在 XunBei-Vue 包出口被调用，
 * 将 compileToFunction 赋值给内部的 compiler 变量。
 *
 * @param _compiler - 编译函数（接受 template，返回 render 函数）
 */
export function registerRuntimeCompiler(_compiler: any) {
  compiler = _compiler
}
