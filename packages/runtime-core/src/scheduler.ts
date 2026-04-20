const queue:any[] = []            //组件更新队列
const activePreFlushCbs:any[]=[]  //组件更新之前的队列

let isFlushPending=false
const p=Promise.resolve()
//添加需要更新的操作放进一个数组，在微任务的任务队列中依次提取出来并执行，最后一次性渲染更新操作
export function queueJobs(job:any){
    if(!queue.includes(job)){
        queue.push(job)
    }
    queueFlush()
}

function flushJobs(){
    isFlushPending=false
    let job
    //执行组件更新之间的操作
    flushPreCbs()

    //提取出所有更新操作去执行
    while (job=queue.shift()){
        job&&job()
    }
}
//执行组件更新之间的操作
export function flushPreCbs(){
    for(let i=0;i<activePreFlushCbs.length;i++){
        activePreFlushCbs[i]()
    }
}
//添加组件更新之前的回调函数队列
export  function queuePreFlushCb(job:any){
    activePreFlushCbs.push(job)
    queueFlush()
}

function queueFlush(){
    //缓存 每次只调用一次nextTick方法更新
    if(isFlushPending) return
    isFlushPending=true
    nextTick(flushJobs)
}

//支持传入方法以及使用await的方式   nextTick(()=>{})  await nextTick()
export function nextTick(fn?:any){
    return fn?p.then(fn):p
}