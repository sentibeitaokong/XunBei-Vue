import { createVNode } from './vnode.ts'
export function h(type: any, props?: any, children?: any): any {
  return createVNode(type, props, children)
}
