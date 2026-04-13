//全局变量和函数
export const extend=Object.assign

export const isObject=(value:any)=>{
    return value!==null && typeof value==='object'
}

export const hasChanged=(val:any,newVal:any):boolean=>{
    return !Object.is(val,newVal)
}

export  const hasOwn=(val:any,key:any)=>Object.prototype.hasOwnProperty.call(val,key)


//emit事件支持形式
//1. add->Add
//2. add-foo  -> addFoo
//处理事件首字母大写
export const capitalize=(str:string)=>{
    return str.charAt(0).toUpperCase()+str.slice(1)
}
//给事件前面添加on字符
export const toHandleKey=(str:string)=>{
    return str?'on'+capitalize(str):''
}

//处理连字符事件名
export const camelize=(str:string)=>{
    return str.replace(/-(\w)/g,(_:string,c:any)=>{
        return c?c.toUpperCase():''
    })
}