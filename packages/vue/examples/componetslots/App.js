import {h} from '../../dist/XunBei-Vue.esm.js'
import {Foo} from './Foo.js'
window.self=null
export const App={
    //.vue
    //<template></template>
    //render
    name:'App',
    render(){
        window.self=this
        return h('div',
            {
                id:'root',
                class:['red','hard'],
                // onClick(){
                //     console.log('click')
                // },
                // onMousedown(){
                //     console.log('onMouseDown')
                // }
            },
            //setupState
            //this.$el->get root element
            //子节点string类型
            // 'hi,'+this.msg
            //子节点Array类型
            // [
            //     h('p',{class:'red'},'hi'),
            //     h('p',{class:'blue'},'XunBei-Vue'),
            // ]
            //props传值
            [h('div',{},'hi'+this.msg),h(Foo,{
                count:1,
                //emit on+Event
                onAdd(a,b){
                    console.log('onEmitAdd',a,b)
                },
                onAddFoo(c,d){
                    console.log('onAddFoo',c,d)
                }
            })]
        )
    },
    setup(){
        //composition app
        return {
            msg:'XunBei-Vue'
        }
    }
}