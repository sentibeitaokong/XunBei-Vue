//全局变量和函数
export const extend=Object.assign

export const isObject=(value:any)=>{
    return value!==null && typeof value==='object'
}

export const hasChanged=(val:any,newVal:any):boolean=>{
    return !Object.is(val,newVal)
}