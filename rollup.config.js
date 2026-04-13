import typescript from "@rollup/plugin-typescript";
import pkg from './package.json' with { type: 'json' };
export default {
    input: './src/index.ts',
    output: [
        //1.cjs ->common.js
        //2.esm-> esModule
        {
            format:'cjs',
            file:pkg.main,
        },
        {
            format:'es',
            file:pkg.module,
        }
    ],
    plugins:[
        typescript()
    ],
    // 👇 添加这个 onwarn 钩子来静音循环依赖警告
    onwarn: (warning, warn) => {
        // 如果是循环依赖警告，并且出自 src/reactivity 目录，我们就忽略它
        if (
            warning.code === 'CIRCULAR_DEPENDENCY' &&
            warning.message.includes('src/reactivity')
        ) {
            return;
        }
        // 其他警告正常打印
        warn(warning);
    }
}