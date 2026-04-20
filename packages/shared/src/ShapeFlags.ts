export const enum ShapeFlags  {
    //位运算  a|b  ab同时满足  a&b  b满足a的条件
    ELEMENT = 1, // 0001   element节点
    STATEFUL_COMPONENT = 1 << 1, // 0010 组件
    TEXT_CHILDREN = 1 << 2, // 0100   子节点是文本
    ARRAY_CHILDREN = 1 << 3, // 1000  子节点是array 需要循环递归Patch
    SLOT_CHILDREN=1 << 4     //10000   节点是作用域插槽
}