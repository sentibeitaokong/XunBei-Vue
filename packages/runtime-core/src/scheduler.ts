/**
 * @file 异步调度器 —— 将组件更新操作批量异步执行
 *
 * 核心机制：
 * 1. 将需要更新的操作收集到队列中
 * 2. 通过 Promise（微任务）在下一轮事件循环中统一执行
 * 3. 支持 nextTick —— 在 DOM 更新后执行回调
 */

/** 组件更新队列 */
const queue: any[] = []
/** 组件更新之前的回调队列 */
const activePreFlushCbs: any[] = []

let isFlushPending = false
const p = Promise.resolve()

/**
 * 将更新任务加入队列，并在微任务中统一刷新执行。
 *
 * @param job - 需要执行的更新函数
 */
export function queueJobs(job: any) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  queueFlush()
}

/** 刷新组件更新队列 —— 依次执行所有更新任务 */
function flushJobs() {
  isFlushPending = false
  let job
  // 执行组件更新之前的回调
  flushPreCbs()

  // 提取出所有更新操作依次执行
  while ((job = queue.shift())) {
    job && job()
  }
}

/**
 * 执行组件更新之前的回调队列（pre flush callbacks）。
 *
 * 例如 watch 的回调会在此阶段执行。
 */
export function flushPreCbs() {
  for (let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]()
  }
}

/**
 * 添加组件更新之前的回调函数到队列中。
 *
 * @param job - 预刷新回调函数
 */
export function queuePreFlushCb(job: any) {
  activePreFlushCbs.push(job)
  queueFlush()
}

/** 触发队列刷新 —— 带缓存，同一轮事件循环中只调用一次 nextTick */
function queueFlush() {
  if (isFlushPending) return
  isFlushPending = true
  nextTick(flushJobs)
}

/**
 * 在下一轮事件循环（微任务）中执行回调。
 *
 * 支持两种调用方式：
 * - `nextTick(() => { ... })` —— 传入回调函数
 * - `await nextTick()` —— 作为 Promise 使用
 *
 * @param fn - 可选的回调函数
 * @returns 如果提供了 fn 则返回 Promise<void>，否则返回 Promise.resolve()
 */
export function nextTick(fn?: any) {
  return fn ? p.then(fn) : p
}
