/**
 * @file 组件更新判断工具
 */

/**
 * 判断组件是否需要更新。
 *
 * 通过对比新旧 VNode 的 props 来决定是否需要触发组件的 update。
 *
 * @param prevVnode - 旧的 VNode
 * @param nextVnode - 新的 VNode
 * @returns 如果 props 发生了变化则返回 true
 */
export function shouldUpdateComponent(prevVnode: any, nextVnode: any) {
  const { props: prevProps } = prevVnode
  const { props: nextProps } = nextVnode
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}
