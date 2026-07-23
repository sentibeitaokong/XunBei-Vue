# XunBei-Vue

XunBei-Vue 是一个使用 TypeScript 从零实现的精简版 Vue 3，主要用于学习和理解 Vue 3 的核心设计与运行机制。项目采用 pnpm workspace 管理多个功能包，覆盖响应式系统、组件运行时、浏览器渲染器以及模板编译等核心流程。

> 本项目以源码学习和原理实践为目标，并非 Vue 官方实现，不建议直接用于生产环境。

## 已实现功能

- 响应式系统：`reactive`、`readonly`、`shallowReadonly`、`ref`、`computed`、`effect`、`watch` 等。
- 组件机制：组件实例、`setup`、Props、Slots、Emit、`provide/inject` 和 `getCurrentInstance`。
- 渲染系统：虚拟 DOM、组件挂载与更新、文本节点、Fragment、带 key 子节点 Diff 和 `nextTick` 调度。
- 跨平台渲染：通过 `createRenderer` 注入宿主操作，并提供浏览器 DOM 渲染器。
- 模板编译：模板解析、AST 转换、代码生成，以及运行时编译器注册。
- 工程支持：TypeScript、Rollup 打包、Vite 示例预览和 Vitest 单元测试。

## 项目结构

```text
XunBei-Vue/
├── packages/
│   ├── compiler-core/  # 模板解析、转换与代码生成
│   ├── reactivity/     # 响应式系统
│   ├── runtime-core/   # 平台无关的组件与渲染核心
│   ├── runtime-dom/    # 浏览器 DOM 宿主操作
│   ├── shared/         # 公共工具与类型标记
│   └── vue/            # 对外统一入口、构建产物与示例
├── package.json
├── pnpm-workspace.yaml
├── rollup.config.js
└── tsconfig.json
```

各模块的主要依赖关系如下：

```text
vue -> runtime-dom -> runtime-core -> reactivity
 |          |               |             |
 └-> compiler-core          └----------> shared
```

## 快速开始

请先准备 Node.js 和 pnpm，然后在项目根目录执行：

```bash
pnpm install
pnpm build
pnpm dev
```

开发服务器启动后，可访问终端显示的地址，并打开 `/packages/vue/examples/` 查看基础示例。其他示例位于 `packages/vue/examples` 下，包括响应式更新、组件更新、Slots、依赖注入、Watch、模板编译和自定义渲染器等。

## 常用命令

```bash
# 启动 Vite 开发服务器
pnpm dev

# 使用 Rollup 构建 CommonJS 与 ES Module 产物
pnpm build

# 运行单元测试
pnpm test
```

构建产物会生成到 `packages/vue/dist`：

- `XunBei-Vue.esm.js`
- `XunBei-Vue.cjs.js`

## 简单示例

```js
import { createApp, h, ref } from './packages/vue/dist/XunBei-Vue.esm.js'

const App = {
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    return { count, increment }
  },
  render() {
    return h(
      'button',
      { onClick: this.increment },
      `count: ${this.count}`,
    )
  },
}

createApp(App).mount(document.querySelector('#app'))
```

## 学习路线

建议按照以下顺序阅读源码：

1. `packages/shared`：了解公共工具和虚拟节点类型标记。
2. `packages/reactivity`：理解依赖收集、触发更新、Ref 和 Computed。
3. `packages/runtime-core`：理解虚拟 DOM、组件初始化、更新与调度。
4. `packages/runtime-dom`：了解核心渲染器如何适配浏览器 DOM。
5. `packages/compiler-core`：跟踪模板从解析到生成渲染函数的过程。
6. `packages/vue`：查看运行时与编译器如何组合为最终入口。

## 测试

测试主要覆盖响应式系统、模板编译和 Watch API。执行以下命令运行全部测试：

```bash
pnpm test
```
