import {NodeTypes} from "./ast.ts";

//枚举 开始标签 / 结束标签
const enum TagType{
    Start,
    End,
}

//基础编译
export function baseParse(content:string){
    //序列化文本
    const context=createParseContext(content);
    //返回编译后的数据  []存储解析的标签
    return createRoot(parseChildren(context,[]))
}

//序列化文本信息
function createParseContext(content:string){
    return {
        source:content
    }
}

//创建根文本
function createRoot(children:any){
    return {
        children,
        type:NodeTypes.ROOT
    }
}

//解析文本数据  ancestors存储之前解析的标签
function parseChildren(context:any,ancestors:any){
    const nodes:any[]=[]
    //没有结束标识时就一直解析
    while(!isEnd(context,ancestors)){
        let node:any
        const s=context.source
        //当文本数据是以双大括号为开头的就提取里面的变量
        if(s.startsWith('{{')){
            node=parseInterpolation(context)
        }else if(s[0]==='<'){
            //如果文本数据是以<为开头，说明是一个标签，并且第二个字符是小写字母，说明是一个基础element标签，而不是组件标签
            if(/[a-z]/i.test(s[1])){
                node=parseElement(context,ancestors)
            }
        }
        //如果不是插值也不是标签开头，那就是普通文本
        if(!node){
            node=parseText(context)
        }
        nodes.push(node)
    }
    return nodes

}

function isEnd(context:any,ancestors:any){
    //1.遇到结束标签
    //2.context.source没有值的时候
    const s:any=context.source
    if(s.startsWith('</')){
        //遍历之前存储过的开始标签，比对是否相同，相同则说明需要结束解析
        for(let i:number=ancestors.length-1;i>=0;i--){
            const currentTag=ancestors[i].tag;
            //tag比对
            if(startsWithEndTagOpen(s, currentTag)){
                return true
            }
        }
    }
    return !s
}

//将element文本标签转换成ast语法树 例：<div>hi,{{message}}</div>
function parseElement(context:any,ancestors:any){
    //解析tag <div></div>
    //开始标签返回标签的ast语法树  文本数据变成</div>
    const element:any=parseTag(context,TagType.Start)
    //回溯算法
    //存储解析过的标签
    ancestors.push(element)
    //解析标签内的内容
    element.children=parseChildren(context,ancestors)
    //当开始解析闭合标签的时候，弹出之前解析过的开始标签
    ancestors.pop()
    //判断弹出的标签和现在解析的闭合标签是不是一致的，一致说明时对称的，也就可以移除
    if(startsWithEndTagOpen(context.source,element.tag)){
        //解析闭合的div标签,解析完把闭合标签移除
        parseTag(context,TagType.End)
    }else{
        throw new Error('缺少结束标签:'+element.tag)
    }
    //返回开始标签的ast语法树
    return element
}

function startsWithEndTagOpen(source:any,tag:any){
    return source.startsWith("</")&&source.slice(2,2+tag.length).toLowerCase()===tag
}

//解析tag
function parseTag(context:any,type:TagType){
    //解析开始和闭合的div标签
    const match:any=/^<\/?([a-z]*)/i.exec(context.source)
    // console.log(match)
    //提取tage div
    const tag=match[1]
    //2.删除处理完成的代码
    // ></div>
    advanceBy(context,match[0].length)
    //</div>
    advanceBy(context,1)

    //闭合标签 不返回抽象语法树
    if(type===TagType.End) return

    return {
        type: NodeTypes.ELEMENT,
        tag: tag,
        children: [],
    }
}
//解析普通文本内容
function parseText(context:any){
    //1.获取当前文本的内容  解析文本的时候,遇到{{双大括号或者<就停止,表示文本内容里面有{{变量}}或者<标签>
    //例：<div><p>hi</p>{{message}}</div>
    let endIndex=context.source.length
    let endTokens=['{{','<']
    for(let i=0;i<endTokens.length;i++){
        //找到最近的{{或者<，记录其下标
        const index=context.source.indexOf(endTokens[i])
        if(index!==-1&&endIndex>index){
            endIndex=index
        }
    }
    //2.推进，删除文本内容
    const content=parseTextData(context,endIndex)
    // console.log(context.source)
    return {
        type: NodeTypes.TEXT,
        content: content,
    }
}

//解析提取{{}}双大括号里面的插值变量
function parseInterpolation(context:any){
    //{{message}} 解析vue变量
    const openDelLimiter='{{'
    const closeDelLimiter='}}'
    //找到}}之前的索引 也就右边双大括号的下标 {{message
    const closeIndex=context.source.indexOf(closeDelLimiter,openDelLimiter.length)
    //推进 相当于拿到 message}}，去掉左边的双大括号
    advanceBy(context,openDelLimiter.length)
    //取到message的长度
    const rawContentLength=closeIndex-openDelLimiter.length
    //取出messgae的内容
    const rawContent=parseTextData(context,rawContentLength)
    //去除message变量左右的空格
    const content=rawContent.trim()
    //message}}删除右边的双大括号
    advanceBy(context,closeDelLimiter.length)
    //将插值转换成ast语法树
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        },
    }
}
//推进数据  将已经转换成ast语法树的文本数据丢弃掉
function advanceBy(context:any,length:number){
    context.source=context.source.slice(length)
}
//1.获取文本里面的内容  推进数据
function parseTextData(context:any,length:number){
    //截取数据
    const content=context.source.slice(0,length)
    //推进数据
    advanceBy(context,length)
    return content
}

