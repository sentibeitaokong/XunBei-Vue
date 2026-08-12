/**
 * @file 虚拟节点类型标识 —— 使用位运算标记 VNode 的类型与子节点形态
 *
 * 位运算说明：
 * - `a | b`：同时满足 a 与 b 两种条件（添加标识）
 * - `a & b`：检测 b 是否满足 a 的条件（判断标识）
 */

/** VNode 的 ShapeFlag 枚举，采用位掩码设计便于组合判断 */
export const enum ShapeFlags {
  /** 元素节点（HTML 标签） */
  ELEMENT = 1, // 0001
  /** 有状态组件 */
  STATEFUL_COMPONENT = 1 << 1, // 0010
  /** 子节点是文本类型 */
  TEXT_CHILDREN = 1 << 2, // 0100
  /** 子节点是数组类型，需要循环递归 patch */
  ARRAY_CHILDREN = 1 << 3, // 1000
  /** 子节点是作用域插槽 */
  SLOT_CHILDREN = 1 << 4, // 10000
}
