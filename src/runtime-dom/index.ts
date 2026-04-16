import {createRenderer} from "../runtime-core";

function createElement(type:any){
    return document.createElement(type)

}
//prevVal为旧的props,nextVal为新的props
function patchProp(el:any,key:any,prevVal:any,nextVal:any){
    console.log('旧的props',prevVal)
    //on+Event name 就是点击事件 小写event就是事件名 。
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        //判断是事件就添加事件方法
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, nextVal)
    } else {
        //不是事件说明是props属性，直接添加属性
        //当最新的val值为null或undefined，说明这个属性没有了，就应该删除，否则应该修改
        if(nextVal===undefined||nextVal===null){
            el.removeAttribute(key)
        }else{
            el.setAttribute(key, nextVal)
        }
    }
}
//anchor锚地 指定位置
function insert(child:any,parent:any,anchor:any){
    // parent.append(el)
    //anchor为null 时 默认添加到尾部
    parent.insertBefore(child,anchor || null)
}

function remove(child:any){
    //找到child的父节点，然后调用父节点的removeChild方法移除child节点
    const parent=child.parentNode
    if(parent){
        parent.removeChild(child)
    }
}
function setElementText(el:any,text:any){
    el.textContent=text
}

const renderer:any=createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
})

export function createApp(...args:any[]){
    return renderer.createApp(...args)
}

export * from '../runtime-core/index'
