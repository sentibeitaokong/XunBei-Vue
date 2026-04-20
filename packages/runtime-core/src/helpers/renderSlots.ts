import {createVNode, Fragement} from "../vnode.ts";

export function renderSlots(slots:any,name:any,props:any){
    const slot=slots[name];
    //1.当slots是数组时，需要用div包裹一下才能展示
    if(slot){
        //function 当传递的是一个方法时，说明是作用域插槽
        if(typeof slot==='function'){
            //插槽类型 默认渲染children
            return createVNode(Fragement,{},slot(props))
        }
    }
}