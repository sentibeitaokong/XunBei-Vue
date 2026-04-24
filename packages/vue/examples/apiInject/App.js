// // 组件 provide 和 inject 功能
// import { h, provide, inject } from '../../dist/XunBei-Vue.esm.js'
//
// const Provider = {
//   name: 'Provider',
//   setup() {
//     provide('foo', 'fooVal')
//     provide('bar', 'barVal')
//   },
//   render() {
//     return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
//   },
// }
//
// const ProviderTwo = {
//   name: 'ProviderTwo',
//   setup() {
//     provide('foo', 'fooTwo')
//     const foo = inject('foo')
//
//     return {
//       foo,
//     }
//   },
//   render() {
//     return h('div', {}, [
//       h('p', {}, `ProviderTwo foo:${this.foo}`),
//       h(Consumer),
//     ])
//   },
// }
//
// const Consumer = {
//   name: 'Consumer',
//   setup() {
//     const foo = inject('foo')
//     const bar = inject('bar')
//     console.log(bar)
//     // const baz = inject("baz", "bazDefault");
//     const baz = inject('baz', () => 'bazDefault')
//
//     return {
//       foo,
//       bar,
//       baz,
//     }
//   },
//
//   render() {
//     return h('div', {}, `Consumer: - ${this.foo} - ${this.bar}-${this.baz}`)
//   },
// }
import { reactive, effect, computed, h } from '../../dist/XunBei-Vue.esm.js'
export default {
  name: 'App',
  setup() {
    const obj = reactive({
      name: '张三',
    })

    const computedObj = computed(() => {
      console.log('计算属性执行计算')
      return '姓名：' + obj.name
    })

    effect(() => {
      document.querySelector('#app').innerHTML = computedObj.value
      document.querySelector('#app').innerHTML = computedObj.value
    })

    setTimeout(() => {
      obj.name = '李四'
    }, 2000)
  },
  render() {
    return h('div', {}, [h('p', {}, '')])
  },
}
