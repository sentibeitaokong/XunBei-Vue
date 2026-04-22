//创建虚拟节点
import { ShapeFlags } from '@xunbei-vue/shared'
export const Fragement = Symbol('Fragement')
export const Text = Symbol('Text')

export { createVNode as createElementVNode }

export function createVNode(type: any, props?: any, children?: any) {
  const vnode = {
    type,
    props,
    children,
    key: props && props.key,
    ShapeFlag: getShapeFlag(type),
    component: null,
    el: null,
  }
  //位运算 a｜b  同时满足ab两种条件
  if (typeof children === 'string') {
    //children是string类型就是element节点
    vnode.ShapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    //children是数组就是组件
    vnode.ShapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  //判断是否是插槽
  //组件+children object
  if (vnode.ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      //设置标识为插槽
      vnode.ShapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }
  return vnode
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type: any) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}
