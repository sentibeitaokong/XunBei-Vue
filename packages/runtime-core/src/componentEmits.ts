import { toHandleKey, camelize } from '@xunbei-vue/shared'

export function emit(instance: any, event: any, ...args: any[]) {
  //instance.props  -> emit event
  const { props } = instance
  //TPP
  //先去写一个特定的行为->重构成通用的行为

  //可执行事件名称
  const handleName = toHandleKey(camelize(event))
  //获取props上面指定的event事件并执行
  const handler = props[handleName]
  handler && handler(...args)
}
