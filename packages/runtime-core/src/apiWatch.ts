import { ReactiveEffect } from '@xunbei-vue/reactivity'
import { queuePreFlushCb } from './scheduler'

export function watchEffect(source: any) {
  //执行依赖里面的回调函数
  function job() {
    effect.run()
  }
  //存储回调函数
  let cleanup: any
  //第一次执行onCleanup,存储回调函数的指针
  const onCleanup = function (fn: any) {
    //当执行stop清空依赖后执行的副作用函数
    cleanup = effect.onStop = () => {
      fn()
    }
  }
  function getter() {
    //当cleanup有值时，才执行onCleanup里面的回调函数
    if (cleanup) {
      cleanup()
    }
    source(onCleanup)
  }

  //添加依赖，将依赖添加到组件更新之前的队列
  const effect = new ReactiveEffect(getter, () => {
    queuePreFlushCb(job)
  })
  //默认依赖执行一次
  effect.run()
  //返回清空依赖的方法
  return () => {
    effect.stop()
  }
}
