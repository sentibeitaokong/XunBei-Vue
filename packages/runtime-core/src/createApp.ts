/**
 * @file createApp —— 应用入口的工厂函数
 *
 * 通过 createAppAPI 闭包持有 render 函数，
 * 返回 createApp 方法用于创建应用实例并挂载到 DOM。
 */

import { createVNode } from './vnode.ts'

/**
 * 创建 createApp 工厂函数的 API。
 *
 * 利用闭包将 render 函数注入 createApp，
 * 使得 createApp 可以跨平台使用（DOM / Canvas / 终端等）。
 *
 * @param render - 渲染函数（由 createRenderer 提供）
 * @returns createApp 函数
 */
export function createAppAPI(render: any) {
  return function createApp(rootComponent: any) {
    return {
      /**
       * 将根组件挂载到指定容器。
       *
       * 流程：组件 -> VNode -> render(VNode, container)
       * 所有逻辑操作都基于 VNode 进行。
       *
       * @param rootContainer - 挂载的目标 DOM 容器
       */
      mount(rootContainer: any) {
        // 组件转换成虚拟节点
        const vnode = createVNode(rootComponent)
        // 渲染虚拟节点到容器中
        render(vnode, rootContainer)
      },
    }
  }
}
