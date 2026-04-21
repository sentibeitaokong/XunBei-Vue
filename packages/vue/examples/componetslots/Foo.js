import {h} from "../../dist/XunBei-Vue.esm.js";

export const Foo = {
    setup(props, {emit}) {
        //1.接收props 2.可以使用this.获取props的值  3.props不可修改  shadowReadonly
        props.count++
        const emitAdd = () => {
            emit('add',1,2)
            emit('add-foo', 1, 2, 3)
        }
        return {
            emitAdd
        }
    },
    render() {
        const btn =h('button',{
            onClick:this.emitAdd
        },'emitAdd')
        const foo=h('p',{},'foo')
        return h('div', {}, [foo,btn])
    }
}