// 1. 定义 Runner 接口
import {extend} from "../../shared/src";

export interface Runner {
    (): any;                  // 表示 runner 本身是一个可以调用的函数
    effect: ReactiveEffect;   // 表示 runner 上挂载了 effect 实例
}

let activeEffect:any;
let shouldTrack:any;
//依赖类
export class ReactiveEffect {
    private _fn:any;
    //依赖数组
    deps=[];
    //是否可用 响应式
    active=true
    //清空依赖执行的副作用函数
    onStop?:()=>void;
    public scheduler:Function|undefined;
    constructor(fn:any,scheduler:any) {
        this._fn = fn;
        this.scheduler=scheduler
    }
    run(){
        //1.会收集依赖 。利用shouldTrack来区别  stop以后不让收集依赖
        if(!this.active){
            return this._fn()
        }
        shouldTrack=true
        activeEffect=this
        //执行fn方法时会收集依赖，收集完依赖再把shouldTrack置为false，防止依赖再次重复收集
        const result=this._fn()
        //reset
        shouldTrack=false
        return result
    }
    stop(){
        if(this.active){
            cleanupEffect(this)
            if(this.onStop){
                this.onStop()
            }
            this.active=false
        }
    }
}
//清除依赖
function cleanupEffect(effect:any){
    effect.deps.forEach((dep:any)=>{
        dep.delete(effect)
    })
    effect.deps.length=0
}

//存储依赖
export function effect(fn:any,options:any={}){
    //fn
    const scheduler=options.scheduler
    const _effect=new ReactiveEffect(fn,scheduler);
    //合并options选项
    extend(_effect,options)
    _effect.run()
    const runner:any=_effect.run.bind(_effect)
    runner.effect=_effect
    //手动执行更新的函数
    return runner
}

//触发收集依赖
const targetMap=new Map();
export function track(target:any, propertyKey:string) {
    //状态为不收集依赖时直接返回
    if(!isTracking()) return;

    //traget(目标)->key(目标属性)->dep(依赖项)
    let depsMap=targetMap.get(target);
    if(!depsMap){
        depsMap=new Map()
        targetMap.set(target,depsMap)
    }
    let dep=depsMap.get(propertyKey);
    if(!dep){
        dep=new Set()
        depsMap.set(propertyKey,dep)
    }
    trackEffects(dep)
}
//ref收集依赖
export function trackEffects(dep:any){
    //避免重复收集依赖
    if(dep.has(activeEffect)) return
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}
//是否可以收集依赖
export  function isTracking(){
    //触发get操作还在收集依赖阶段 activeEffect为undefined时不收集依赖
    //不需要收集依赖的时候shouldTrack为false
    return shouldTrack&&activeEffect!==undefined
}
//触发依赖
export  function trigger(target:any, propertyKey:string) {
    let depsMap=targetMap.get(target);
    let dep=depsMap.get(propertyKey);
    triggerEffects(dep)
}

//ref触发依赖
export function triggerEffects(dep:any){
    for(const effect of dep){
        if(effect.scheduler){
            effect.scheduler()
        }else{
            effect.run()
        }
    }
}

//停止收集依赖
export function stop(runner:Runner):void{
    runner.effect?.stop()
}