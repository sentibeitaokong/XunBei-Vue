// // 组件 provide 和 inject 功能
import { reactive, watch, h } from '../../dist/XunBei-Vue.esm.js'
export default {
  name: 'App',
  setup() {
    const obj = reactive({
      name: '张三',
    })

    watch(
      obj,
      (value, oldValue) => {
        console.log('watch 监听被触发')
        console.log('value', value)
      },
      { immediate: true },
    )

    setTimeout(() => {
      obj.name = '李四'
    }, 2000)
  },
  render() {
    return h('div', {}, [h('p', {}, '')])
  },
}
