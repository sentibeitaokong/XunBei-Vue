import {ReactiveEffect} from "./effect.ts";

class ComputedRefImpl{
    private _getter:any
    private _dirty:boolean=true   //缓存标识 true：没有缓存值 false:有缓存值
    private _value:any
    private _effect:any
    constructor(getter:any) {
        this._getter=getter
        this._effect=new ReactiveEffect(getter,()=>{
            if(!this._dirty){
                this._dirty=true
            }
        })
    }
    get value(){
        //get
        //当响应式依赖对象发生改变以后 get value获取最新值并收集依赖->dirty赋值true
        if(this._dirty){
            //缓存标识改变，有缓存值
            this._dirty=false
            this._value=this._effect.run()
        }
        //有缓存值时，直接返回缓存值
        return this._value
    }
}
export function computed(getter:any){
    return new ComputedRefImpl(getter)
}
