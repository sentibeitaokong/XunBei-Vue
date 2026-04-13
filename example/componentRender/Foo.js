import {h} from "../../lib/XunBei-Vue.esm.js";
import {renderSlots} from "../../lib/XunBei-Vue.esm.js";

export const Foo = {
    setup(props, {emit}) {
        return {}
    },
    render() {
        const age=18
        const foo = h('p', {}, 'foo')
        //children->vnode
        //renderSlots
        // 具名插槽
        //1.默认使用的createVnode只能将单个标签渲染成Vnode，无法渲染数组，用renderSlots包裹可以保证slots传递的是数组时，也可以渲染
        //2.获取需要渲染的元素，并渲染到指定位置
        //作用域插槽
        return h('div', {}, [renderSlots(this.$slots,'header',{age}),foo, renderSlots(this.$slots,'footer')])
    }
}