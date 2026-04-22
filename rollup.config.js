import typescript from '@rollup/plugin-typescript'
export default {
  input: './packages/vue/src/index.ts',
  output: [
    //1.cjs ->common.js
    //2.esm-> esModule
    {
      format: 'cjs',
      file: 'packages/vue/dist/XunBei-Vue.cjs.js',
    },
    {
      format: 'es',
      file: 'packages/vue/dist/XunBei-Vue.esm.js',
    },
  ],
  plugins: [typescript()],
  // 👇 添加这个 onwarn 钩子来静音循环依赖警告
  onwarn: (warning, warn) => {
    // 如果是循环依赖警告，并且出自 src/reactivity 目录，我们就忽略它
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      return
    }
    // 其他警告正常打印
    warn(warning)
  },
}
