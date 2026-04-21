import {h} from '../../dist/XunBei-Vue.esm.js'
import {createTextVNode} from '../../dist/XunBei-Vue.esm.js'
import {Foo} from './Foo.js'
export const App={
    name:'App',
    render(){
        //createTextVNode 可以渲染一个无标签的节点，之前的createVnode方法必须指定标签才能渲染成vnode节点
        const app=h('div',{},'app')
        const foo=h(Foo,{},{
            //需要渲染的具名插槽
            header:({age})=>[h('p',{},'header'+age),
                createTextVNode('你好啊')
            ],
            footer:()=>h('p',{},'footer')
        })
        // const foo=h(Foo,{},h('p',{},'123'))
        return h('div',
            {
            },[foo,app]
        )
    },
    setup(){
        //composition app
        return {

        }
    }
}