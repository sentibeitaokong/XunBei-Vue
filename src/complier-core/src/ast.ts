export const enum NodeTypes {
    INTERPOLATION,      //插值
    SIMPLE_EXPRESSION,  //插值里面的变量
    ELEMENT,            //标签
    TEXT,               //普通文本
    ROOT,
    COMPOUND_EXPRESSION,
}