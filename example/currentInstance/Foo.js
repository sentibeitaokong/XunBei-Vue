import {h} from "../../lib/XunBei-Vue.esm.js";
import {getCurrentInstance} from "../../lib/XunBei-Vue.esm.js";

export const Foo = {
    name:'Foo',
    setup() {
        const instance=getCurrentInstance()
        console.log('Foo',instance)
        return {}
    },
    render() {
        return h('p', {}, 'foo')
    }
}