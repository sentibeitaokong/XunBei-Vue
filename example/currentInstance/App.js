import {h} from '../../lib/XunBei-Vue.esm.js'
import {Foo} from './Foo.js'
import {getCurrentInstance} from '../../lib/XunBei-Vue.esm.js'
export const App={
    name:'App',
    render(){
        return h('div',
            {
            },[h('p',{},'currentInstance demo'),h(Foo)]
        )
    },
    setup(){
        //composition app
        const instance=getCurrentInstance()
        console.log('App',instance)
    }
}