/**
 * @file 组件代理实例 —— 通过 Proxy 代理暴露 setupState / props / $el 等属性
 *
 * 使得在 render 函数中可以通过 `this.xxx` 直接访问 setup 返回值、
 * props 以及 $el、$slots、$props 等内置属性。
 */

import { hasOwn } from '@xunbei-vue/shared'

/**
 * 公共属性映射表 —— 将 $el、$slots、$props 等特殊属性
 * 映射到组件实例内部的实际值。
 */
const PublicPropertiesMap: any = {
  $el: (i: any) => i.vnode.el,
  $slots: (i: any) => i.slots,
  $props: (i: any) => i.props,
}

/**
 * 组件实例的 Proxy 处理器（PublicInstanceProxyHandlers）。
 *
 * get 拦截的顺序：
 * 1. 先查找 setupState（setup 返回值）
 * 2. 再查找 props
 * 3. 最后查找 $el、$slots、$props 等公共属性
 */
export const PublicInstanceProxyHandlers = {
  get({ _: instance }: any, key: any) {
    const { setupState, props } = instance

    // 判断 key 的属性是否在 setupState 中
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }

    // key -> $el / $slots / $props 等
    const publicGetter = PublicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
