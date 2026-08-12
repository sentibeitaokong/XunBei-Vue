/**
 * @file 渲染器（Renderer）—— 虚拟 DOM 到真实 DOM 的核心渲染引擎
 *
 * 职责：
 * 1. 将 VNode 渲染为真实 DOM（mount）
 * 2. 比对新旧 VNode 并最小化更新 DOM（patch / diff）
 * 3. 组件实例的创建与挂载
 * 4. 通过 createRenderer 的可选参数实现跨平台（DOM / Canvas 等）
 *
 * Diff 算法采用双端对比 + 最长递增子序列策略。
 */

import { createComponentInstance, setupComponent } from './component.ts'
import { ShapeFlags } from '@xunbei-vue/shared'
import { Fragement, Text } from './vnode.ts'
import { createAppAPI } from './createApp.ts'
import { effect } from '@xunbei-vue/reactivity'
import { EMPTY_OBJ } from '@xunbei-vue/shared'
import { shouldUpdateComponent } from './componentUpdateUtils.ts'
import { queueJobs } from './scheduler.ts'

/**
 * 创建渲染器 —— 框架的渲染核心。
 *
 * 接收平台相关的 DOM 操作函数，返回包含 createApp 的对象。
 * 这种设计允许同一套渲染逻辑跨平台使用（DOM / Canvas / 终端等）。
 *
 * @param options - 平台相关的 DOM 操作
 * @param options.createElement - 创建元素
 * @param options.patchProp - 更新属性
 * @param options.insert - 插入节点
 * @param options.remove - 移除节点
 * @param options.setElementText - 设置文本内容
 * @returns 包含 createApp 方法的渲染器对象
 */
export function createRenderer(options: any) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options

  /**
   * 渲染函数 —— 将 VNode 渲染到指定容器。
   *
   * @param vnode - 要渲染的 VNode
   * @param container - 目标 DOM 容器
   */
  function render(vnode: any, container: any) {
    // patch
    patch(null, vnode, container, null, null)
  }

  /**
   * 核心 patch 方法 —— 比对新旧 VNode 并执行对应的 DOM 操作。
   *
   * @param n1 - 旧的 VNode（null 时为首次挂载）
   * @param n2 - 新的 VNode
   * @param container - 挂载容器
   * @param parentComponent - 父组件实例
   * @param anchor - 插入位置的锚点
   */
  function patch(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    // 根据 ShapeFlag 区分不同的 VNode 类型
    const { type, ShapeFlag } = n2
    switch (type) {
      case Fragement:
        // Fragment —— 只渲染 children（用于插槽和 template）
        processFragment(n1, n2, container, parentComponent, anchor)
        break
      case Text:
        // Text —— 渲染纯文本节点
        processText(n1, n2, container)
        break
      default:
        // 位运算 a & b：判断 b 是否满足 a 的条件
        if (ShapeFlag & ShapeFlags.ELEMENT) {
          // 处理 element
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 处理组件
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break
    }
  }

  /**
   * 处理 Fragment 节点 —— 只渲染其 children。
   */
  function processFragment(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    console.log('oldFragment', n1)
    mountChildren(n2.children, container, parentComponent, anchor)
  }

  /**
   * 处理文本节点 —— 创建 Text 类型的 DOM 节点并添加到容器。
   */
  function processText(n1: any, n2: any, container: any) {
    console.log('oldText', n1)
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  /**
   * 处理组件节点 —— 首次挂载或更新。
   */
  function processComponent(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    if (!n1) {
      // 初始化组件
      mountComponent(n2, container, parentComponent, anchor)
    } else {
      // 更新组件
      updateComponent(n1, n2)
    }
  }

  /**
   * 更新组件 —— 比较新旧 VNode 的 props，决定是否触发重新渲染。
   */
  function updateComponent(n1: any, n2: any) {
    console.log('2')
    if (shouldUpdateComponent(n1, n2)) {
      // 获取组件实例
      const instance = (n2.component = n1.component)
      // 添加更新后的组件实例（下次 update 时使用）
      instance.next = n2
      // 触发组件更新
      instance.update()
    } else {
      const instance = (n2.component = n1.component)
      n2.el = n1.el
      instance.vnode = n2
    }
  }

  /**
   * 处理元素节点（Element）—— 首次挂载或更新。
   */
  function processElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor)
    } else {
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  /**
   * 更新元素（Element）—— 对比并更新 props 和 children。
   */
  function patchElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    console.log('patchElement container', container)
    // 新旧节点对比 —— 获取 el（n2 初始化时可能没有值，直接将 n1.el 赋给 n2.el）
    const el = (n2.el = n1.el)

    // 更新 props
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    patchProps(el, oldProps, newProps)

    // 更新 children
    patchChildren(n1, n2, el, parentComponent, anchor)
  }

  /**
   * 比对新旧 props 并更新。
   *
   * 规则：
   * 1. 新旧 props 不相等且有值时，直接更新
   * 2. 新 props 为 null/undefined 时，删除老的 props
   * 3. 新 props 中没有老 props 的某个 key 时，删除该 key
   */
  function patchProps(el: any, oldProps: any, newProps: any) {
    // 老的 props 和新的 props 相等则不需要比对
    if (oldProps !== newProps) {
      // 遍历新的 props，不一致时调用 hostPatchProp 更新
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }
      // 老的 props 不是空对象时才需要遍历删除
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  /**
   * 比对新旧节点的 children。
   *
   * 四种情况：
   * 1. 新节点是文本，老节点是数组 —— 清空老 children，设置新文本
   * 2. 新节点是文本，老节点也是文本 —— 直接设置新文本
   * 3. 新节点是数组，老节点是文本 —— 清空文本，挂载新 children
   * 4. 新老节点都是数组 —— 进入 diff 算法（双端对比）
   */
  function patchChildren(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    const prevShapeFlag = n1.ShapeFlag
    const nextShapeFlag = n2.ShapeFlag
    const c1: any = n1.children
    const c2: any = n2.children

    // 新节点是文本类型
    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 老节点是数组类型 —— 先清空旧节点，再设置新文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children)
        hostSetElementText(container, c2)
      } else {
        // 老节点是文本类型 —— 直接更新文本
        if (c1 !== c2) {
          hostSetElementText(container, c2)
        }
      }
    } else {
      // 新节点是数组，老节点是文本 —— 清空文本，挂载新 children
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(c2, container, parentComponent, anchor)
      } else {
        // 新老节点都是数组 —— diff 算法：双端对比
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  /**
   * 卸载所有子节点 —— 遍历并移除每个子节点的 DOM 元素。
   */
  function unmountChildren(children: any) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el
      hostRemove(el)
    }
  }

  /**
   * Diff 算法 —— 双端对比 + 最长递增子序列。
   *
   * 步骤：
   * 1. 左侧对比 —— 找出左侧相同的节点并 patch
   * 2. 右侧对比 —— 找出右侧相同的节点并 patch
   * 3. 新增节点 —— 新节点比老节点多时插入
   * 4. 删除节点 —— 老节点比新节点多时删除
   * 5. 中间乱序对比 —— 使用 key 建立映射，通过最长递增子序列优化移动
   */
  function patchKeyedChildren(
    c1: any,
    c2: any,
    container: any,
    parentComponent: any,
    parentAnchor: any,
  ) {
    let i: number = 0
    let e1: number = c1.length - 1
    let e2: number = c2.length - 1

    /** 判断两个 VNode 是否同一类型（type 和 key 都相同） */
    function isSameVnodeType(n1: any, n2: any) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 1. 左侧对比 AB(C) -> AB(DE)
    while (i <= e1 && i <= e2) {
      const n1: any = c1[i]
      const n2: any = c2[i]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      i++
    }

    // 2. 右侧对比 (A)BC -> (DE)BC
    while (i <= e1 && i <= e2) {
      const n1: any = c1[e1]
      const n2: any = c2[e2]
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. 新增节点 —— 新节点比老节点多
    // 左侧: (AB) -> (AB)C  i = 2, e1 = 1, e2 = 2
    // 右侧: (AB) -> C(AB)  i = 0, e1 = -1, e2 = 0
    if (i > e1) {
      if (i <= e2) {
        // i+1 < c2.length 说明需要添加在左侧，反之在右侧
        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          // n1 为 null 表示插入操作
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 4. 删除节点 —— 老节点比新节点多
      // 左侧: (AB)C -> (AB)  i = 2, e1 = 2, e2 = 1
      // 右侧: (A)BC -> BC  i = 0, e1 = 0, e2 = -1
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 5. 中间乱序对比
      // 例: a,b,(c,e,d),f,g -> a,b,(e,c),f,g
      let s1: number = i  // 老节点中间起始索引
      let s2: number = i  // 新节点中间起始索引

      const toBePatched = e2 - s2 + 1  // 需要 patch 的节点数量
      let patched: number = 0           // 已经 patch 完的节点数量

      // 建立 key -> 新节点索引 的映射，方便查找
      const keyToNewIndexMap = new Map()
      // 记录新节点在旧节点中对应的索引（0 表示新增节点）
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      let moved = false
      let maxNewIndexSoFar = 0

      // 遍历新节点中间的 key 映射到 Map
      for (let i: number = s2; i <= e2; i++) {
        const nextChild: any = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }

      // 遍历老节点
      for (let i: number = s1; i <= e1; i++) {
        const prevChild: any = c1[i]
        // 已经处理的节点数 >= 需要处理的节点数，剩下的老节点全是多余的，直接删除
        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        let newIndex
        // 当老节点有 key 时，通过 key 去新节点中查找索引
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 当老节点没有 key 时，遍历新节点查找相同类型且都无 key 的节点
          for (let j: number = s2; j <= e2; j++) {
            if (isSameVnodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }

        // 如果没找到对应新节点则删除，否则 patch 更新
        if (newIndex === undefined) {
          hostRemove(prevChild.el)
        } else {
          // 判断是否需要移动：新索引如果不是依次递增，说明需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          // i+1 避免 i=0 时与默认值 0 冲突
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
      }

      // 通过最长递增子序列计算最优移动方案
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      let j: number = increasingNewIndexSequence.length - 1

      // 倒序遍历，以右侧稳定节点作锚点进行插入
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2
        const nextChild = c2[nextIndex]
        const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null

        // newIndexToOldIndexMap[i] === 0 表示该节点在老节点中不存在，需要创建
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        } else if (moved) {
          // 如果当前索引不在最长递增子序列中，说明需要移动
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor)
          } else {
            j--
          }
        }
      }
    }
  }

  /**
   * 挂载元素 —— 创建 DOM 元素、设置属性、挂载子节点。
   */
  function mountElement(
    vnode: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    // 创建 DOM 元素并存储引用
    const el = (vnode.el = hostCreateElement(vnode.type))

    // 处理子节点（string 或 array）
    const { children, ShapeFlag } = vnode
    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent, anchor)
    }

    // 初始化 props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    // 在 anchor 锚点前插入元素
    hostInsert(el, container, anchor)
  }

  /**
   * 挂载子节点数组 —— 遍历 children 并递归 patch。
   */
  function mountChildren(
    children: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    children.forEach((v: any) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  /**
   * 挂载组件 —— 创建组件实例、初始化、设置渲染 effect。
   */
  function mountComponent(
    initialVnode: any,
    container: any,
    parentComponent: any,
    anchor: any,
  ) {
    // 创建组件实例
    const instance = (initialVnode.component = createComponentInstance(
      initialVnode,
      parentComponent,
    ))
    // 初始化组件 props 和 slot 等属性
    setupComponent(instance)
    setupRenderEffect(instance, initialVnode, container, anchor)
  }

  /**
   * 设置组件的渲染 effect —— 将组件的渲染逻辑包裹在 effect 中。
   *
   * 当响应式对象变更时，自动执行 render 生成新的 VNode 并进行 patch。
   */
  function setupRenderEffect(
    instance: any,
    initialVnode: any,
    container: any,
    anchor: any,
  ) {
    // 将更新函数赋值给组件实例的 update 属性
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          // 首次挂载
          console.log('init')
          const { proxy } = instance
          // 调用 render 函数生成 VNode（通过 proxy 使 this 能访问 setupState）
          const subTree = (instance.subTree = instance.render.call(
            proxy,
            proxy,
          ))
          // patch 到容器
          patch(null, subTree, container, instance, anchor)

          // 所有 element 节点挂载后获取根节点
          initialVnode.el = subTree.el
          instance.isMounted = true
        } else {
          // 更新
          console.log('update')
          const { next, vnode } = instance
          // 当组件实例有新的需要更新的 VNode
          if (next) {
            next.el = vnode.el
            updateComponentPreRender(instance, next)
          }
          const { proxy } = instance
          // 生成新的 VNode
          const subTree = instance.render.call(proxy, proxy)
          // 获取上一个 VNode
          const previousSubTree = instance.subTree
          instance.subTree = subTree
          // patch 新旧 VNode
          patch(previousSubTree, subTree, container, instance, anchor)
        }
      },
      {
        scheduler() {
          console.log('update scheduler')
          // 将多个更新操作塞入队列，统一刷新
          queueJobs(instance.update)
        },
      },
    )
  }

  return {
    createApp: createAppAPI(render),
  }
}

/**
 * 更新组件实例的预渲染属性。
 *
 * 1. 将新的 VNode 赋值给组件实例的 vnode
 * 2. 将组件实例的 next 清空
 * 3. 将新 VNode 的 props 赋值给组件实例的 props
 */
function updateComponentPreRender(instance: any, nextVnode: any) {
  instance.vnode = nextVnode
  instance.next = null
  instance.props = nextVnode.props
}

/**
 * 求最长递增子序列 —— 返回递增序列元素的下标。
 *
 * 用于 diff 算法中计算最少 DOM 移动。
 *
 * @param arr - 输入数组
 * @returns 最长递增子序列的下标数组
 *
 * @example
 * getSequence([2, 3, 4, 1, 5]) // 返回 [2, 3, 4, 5] 的下标 [0, 1, 2, 4]
 */
function getSequence(arr: any) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
