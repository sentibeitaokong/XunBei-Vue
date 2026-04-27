// // 组件 provide 和 inject 功能
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
