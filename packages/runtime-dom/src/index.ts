/**
 * @file runtime-dom —— 浏览器 DOM 平台的运行时实现
 *
 * 提供浏览器平台相关的 DOM 操作函数（创建元素、属性处理、插入、删除等），
 * 基于 runtime-core 的 createRenderer 创建平台的渲染器，
 * 并导出 createApp 作为应用入口。
 */

import { createRenderer } from '@xunbei-vue/runtime-core'

/** 重新导出 runtime-core 的全部 API */
export * from '@xunbei-vue/runtime-core'

/**
 * 创建 DOM 元素。
 *
 * @param type - HTML 标签名
 * @returns DOM 元素
 */
function createElement(type: any) {
  return document.createElement(type)
}

/**
 * 处理 DOM 属性/事件更新。
 *
 * - 以 `on[A-Z]` 开头的 key 视为事件监听器
 * - 当 nextVal 为 null/undefined 时删除属性
 *
 * @param el - DOM 元素
 * @param key - 属性名或事件名
 * @param prevVal - 旧值
 * @param nextVal - 新值
 */
function patchProp(el: any, key: any, prevVal: any, nextVal: any) {
  console.log('旧的props', prevVal)
  // on + Event name 就是点击事件
  const isOn = (key: string) => /^on[A-Z]/.test(key)
  if (isOn(key)) {
    // 事件监听器
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    // DOM 属性
    // 当新值为 null 或 undefined 时删除属性，否则设置属性
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}

/**
 * 向指定位置插入 DOM 元素。
 *
 * @param child - 要插入的子元素
 * @param parent - 父元素
 * @param anchor - 锚点元素，null 时默认添加到尾部
 */
function insert(child: any, parent: any, anchor: any) {
  // anchor 为 null 时默认添加到尾部
  parent.insertBefore(child, anchor || null)
}

/**
 * 从 DOM 中移除子元素。
 *
 * @param child - 要移除的子元素
 */
function remove(child: any) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}

/**
 * 设置元素的文本内容。
 *
 * @param el - DOM 元素
 * @param text - 文本内容
 */
function setElementText(el: any, text: any) {
  el.textContent = text
}

/** 创建浏览器平台的渲染器 */
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
})

/**
 * 创建 Vue 应用实例并返回。
 *
 * 这是框架的最终入口 —— 用户通过 `createApp(App).mount('#app')` 启动应用。
 *
 * @param args - 传递给 createApp 的参数（根组件）
 * @returns 应用实例（含 mount 方法）
 */
export function createApp(...args: any[]) {
  return renderer.createApp(...args)
}
