export const enum ShapeFlags  {
    //位运算  a|b  ab同时满足  a&b  b满足a的条件
    ELEMENT = 1, // 0001
    STATEFUL_COMPONENT = 1 << 1, // 0010
    TEXT_CHILDREN = 1 << 2, // 0100
    ARRAY_CHILDREN = 1 << 3, // 1000
}