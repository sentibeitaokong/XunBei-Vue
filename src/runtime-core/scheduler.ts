const queue:any[] = []
let isFlushPending=false
const p=Promise.resolve()
//添加需要更新的操作放进一个数组，在微任务的任务队列中依次提取出来并执行，最后一次性渲染更新操作
export function queueJobs(job:any){
    if(!queue.includes(job)){
        queue.push(job)
    }
    queueFlush()
}

function queueFlush(){
    //缓存 每次只调用一次nextTick方法更新
    if(isFlushPending) return
    isFlushPending=true
    nextTick(flushJobs)
}

function flushJobs(){
    isFlushPending=false
    let job
    //提取出所有更新操作去执行
    while (job=queue.shift()){
        job&&job()
    }
}

export function nextTick(fn:any){
    return fn?p.then(fn):p
}