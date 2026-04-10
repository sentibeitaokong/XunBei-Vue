import {h} from '../lib/XunBei-Vue.esm.js'
window.self=null
export const App={
    //.vue
    //<template></template>
    //render
    render(){
        window.self=this
        return h('div',
            {
                id:'root',
                class:['red','hard']
            },
            //setupState
            //this.$el->get root element
            //子节点string类型
            'hi,'+this.msg

            //子节点Array类型
            // [
            //     h('p',{class:'red'},'hi'),
            //     h('p',{class:'blue'},'XunBei-Vue'),
            // ]
        )
    },
    setup(){
        //composition app
        return {
            msg:'XunBei-Vue'
        }
    }
}