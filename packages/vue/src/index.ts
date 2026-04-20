//XunBei-Vue 出口
//依赖runtime-dom
export * from '../../runtime-dom/src'

import {baseCompile} from '../../complier-core/src'
import * as runtimeDom from '../../runtime-dom/src'
import {registerRuntimeCompiler} from "../../runtime-dom/src";

function compileToFunction(template:any) {
    //将模板转换成 有render函数的字符串 例:
    // return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //   return (_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message), 1 /* TEXT */))
    // }
    const {code}=baseCompile(template)
    //1. 传入 runtimeDom 作为实参，赋值给形参 Vue,这里的 runtimeDom 是一个对象，包含了 Vue 运行时需要的所有 API
    // 相当于：const { toDisplayString: _toDisplayString, openBlock: _openBlock, createElementBlock: _createElementBlock } = Vue

    //2. 执行函数体，返回结果赋值给 render。
    //相当于把(_openBlock(), _createElementBlock("div", null, "hi," + _toDisplayString(_ctx.message)
    // 这个字符串内容赋值给了render属性，render调用后就会执行里面的方法
    const render:any=new Function('Vue',code)(runtimeDom)
    return render;
}
//vue->runtimeDom->runtimeCore->reactivity    包引用指针
registerRuntimeCompiler(compileToFunction);
