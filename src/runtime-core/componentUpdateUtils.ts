export function shouldUpdateComponent(prevVnode:any,nextVnode:any) {
    //取出前后vnode的props进行比对
    const {props:prevProps}=prevVnode
    const {props:nextProps}=nextVnode
    for(const key in nextProps){
        if(nextProps[key]!==prevProps[key]){
            return true
        }
    }
    return false
}