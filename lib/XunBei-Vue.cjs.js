'use strict';

var ShapeFlags;
(function (ShapeFlags) {
    //位运算  a|b  ab同时满足  a&b  b满足a的条件
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 2] = "STATEFUL_COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 4] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 8] = "ARRAY_CHILDREN";
    ShapeFlags[ShapeFlags["SLOT_CHILDREN"] = 16] = "SLOT_CHILDREN"; //10000   节点是作用域插槽
})(ShapeFlags || (ShapeFlags = {}));

//创建虚拟节点
const Fragement = Symbol('Fragement');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: props && props.key,
        ShapeFlag: getShapeFlag(type),
        component: null,
        el: null
    };
    //位运算 a｜b  同时满足ab两种条件
    if (typeof children === 'string') {
        //children是string类型就是element节点
        vnode.ShapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
    else if (Array.isArray(children)) {
        //children是数组就是组件
        vnode.ShapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }
    //判断是否是插槽
    //组件+children object
    if (vnode.ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        if (typeof children === 'object') {
            //设置标识为插槽
            vnode.ShapeFlag |= ShapeFlags.SLOT_CHILDREN;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    //1.当slots是数组时，需要用div包裹一下才能展示
    if (slot) {
        //function 当传递的是一个方法时，说明是作用域插槽
        if (typeof slot === 'function') {
            //插槽类型 默认渲染children
            return createVNode(Fragement, {}, slot(props));
        }
    }
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function toDisplayString(value) {
    return String(value);
}

//全局变量和函数
const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
const isString = (value) => typeof value === 'string';
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
//emit事件支持形式
//1. add->Add
//2. add-foo  -> addFoo
//处理事件首字母大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
//给事件前面添加on字符
const toHandleKey = (str) => {
    return str ? 'on' + capitalize(str) : '';
};
//处理连字符事件名
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};

//便于处理其他属性
const PublicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        //setupState
        const { setupState, props } = instance;
        //判断key的属性是否在props里面，在的话直接返回
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        //key -> $el   如果是通过$el去取值
        const publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

// 1. 定义 Runner 接口
let activeEffect;
let shouldTrack;
//依赖类
class ReactiveEffect {
    _fn;
    //依赖数组
    deps = [];
    //是否可用 响应式
    active = true;
    onStop;
    scheduler;
    constructor(fn, scheduler) {
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        //1.会收集依赖 。利用shouldTrack来区别  stop以后不让收集依赖
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        //执行fn方法时会收集依赖，收集完依赖再把shouldTrack置为false，防止依赖再次重复收集
        const result = this._fn();
        //reset
        shouldTrack = false;
        return result;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
//清除依赖
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
//存储依赖
function effect(fn, options = {}) {
    //fn
    const scheduler = options.scheduler;
    const _effect = new ReactiveEffect(fn, scheduler);
    //合并options选项
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    //手动执行更新的函数
    return runner;
}
//触发收集依赖
const targetMap = new Map();
function track(target, propertyKey) {
    //状态为不收集依赖时直接返回
    if (!isTracking())
        return;
    //traget(目标)->key(目标属性)->dep(依赖项)
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(propertyKey);
    if (!dep) {
        dep = new Set();
        depsMap.set(propertyKey, dep);
    }
    trackEffects(dep);
}
//ref收集依赖
function trackEffects(dep) {
    //避免重复收集依赖
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
//是否可以收集依赖
function isTracking() {
    //触发get操作还在收集依赖阶段 activeEffect为undefined时不收集依赖
    //不需要收集依赖的时候shouldTrack为false
    return shouldTrack && activeEffect !== undefined;
}
//触发依赖
function trigger(target, propertyKey) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(propertyKey);
    triggerEffects(dep);
}
//ref触发依赖
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
//get
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, propertyKey) {
        if (propertyKey === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        }
        else if (propertyKey === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        const res = Reflect.get(target, propertyKey);
        //如果是shallowReadonly,则shallow为true,直接返回数据
        if (shallow) {
            return res;
        }
        //判断res是不是object对象
        if (isObject(res)) {
            //对象嵌套执行reactive和readonly方法
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            //依赖收集
            track(target, propertyKey);
        }
        return res;
    };
}
//set
function createSetter() {
    return function set(target, propertyKey, value) {
        const res = Reflect.set(target, propertyKey, value);
        //触发依赖
        trigger(target, propertyKey);
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, propertyKey) {
        console.warn(`key :"${String(propertyKey)}" set 失败，因为 target 是 readonly 类型`, target);
        return true;
    }
};
//改写readonlyHandlers
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
})(ReactiveFlags || (ReactiveFlags = {}));
function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
//readonly方法不会收集依赖也不会触发set
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
//shallowReadonly方法只有表层对象不会收集依赖也不会触发set
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
//创建一个响应式的对象
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target :"${target}"必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function emit(instance, event, ...args) {
    //instance.props  -> emit event
    const { props } = instance;
    //TPP
    //先去写一个特定的行为->重构成通用的行为
    //可执行事件名称
    const handleName = toHandleKey(camelize(event));
    //获取props上面指定的event事件并执行
    const handler = props[handleName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    //slots 是插槽就处理
    const { vnode } = instance;
    if (vnode.ShapeFlag & ShapeFlags.SLOT_CHILDREN) {
        normalizeObjectSlots(children, instance.slots);
    }
}
//转换类型为object插槽
function normalizeObjectSlots(children, slots) {
    //保证slots返回的是一个数组 方便渲染
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
//转换插槽内容为数组
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

class RefImpl {
    _value;
    dep;
    _rawValue;
    __v_isRef = true;
    constructor(value) {
        //保留一份原始值用作后续比较
        this._rawValue = value;
        //如果ref的value值是对象，那对象里面的值会被转换成reactive,如果不是则直接复制为value
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        //先修改value值，再触发依赖
        //newValue->this._value->是否相等  相等不触发依赖 Object.is 同值相等
        //如果ref是对象，则对象内部会被转换成reactive形式,因此我们这里用this._rawValue原始值作比较
        if (hasChanged(this._rawValue, newValue)) {
            //赋值原始值
            this._rawValue = newValue;
            //赋值转换后的值
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
//原始值转换
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
//收集ref依赖
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
//创建ref值
function ref(value) {
    return new RefImpl(value);
}
//判断是否是ref值
function isRef(ref) {
    return !!ref.__v_isRef;
}
//如果参数是 ref，则返回内部值，否则返回参数本身。这是 val = isRef(val) ? val.value : val 计算的一个语法糖
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
//你能以操作普通对象的方式，来操作一个内部可能包含 ref 的对象，而无需时刻使用 .value 来取值或赋值。
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, propertyKey) {
            // get -> 发现是一个ref值 那么就返回ref.value
            //not ref -> 直接返回值
            return unRef(Reflect.get(target, propertyKey));
        },
        set(target, propertyKey, value) {
            //set ->ref->调用.value赋值
            //当旧值是ref值，而新值是原始值时，直接.value赋值，可以保留响应式，新值是ref值，则直接赋值就可以。
            if (isRef(target[propertyKey]) && !isRef(value)) {
                return target[propertyKey].value = value;
            }
            else {
                return Reflect.set(target, propertyKey, value);
            }
        }
    });
}

//创建组件实例 组件实例里面包含当前的虚拟节点vnode已经其他一些属性
function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type, //vnode类型
        next: null, //下一个更新的vnode
        setupState: {}, //setup方法里面返回的属性
        props: {},
        slots: {},
        provides: parent ? parent.provides : {}, //provide数据
        parent, //父组件 vnode
        isMounted: false,
        subTree: {}, ///记录上一个vnode节点
        emit: () => { }
    };
    //初始化赋值
    component.emit = emit.bind(null, component);
    return component;
}
//初始化组件
function setupComponent(instance) {
    //TODO 初始化props和初始化slots
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    //初始化有状态的组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //取出组件实例中虚拟节点的type属性
    const Component = instance.type;
    //ctx 使用Proxy代理，提取虚拟dom上setup方法返回的属性值
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    //取出组件实例中的setup属性
    const { setup } = Component;
    if (setup) {
        //获取当前组件实例
        setCurrentInstance(instance);
        //setup方法有function和object两种返回值
        //1.function直接作为render函数渲染组件
        //2.object 则直接充当组件实例中的属性
        //获取setup中的返回值,浅层次props的值不可修改
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        //重置状态
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    //function object
    //TODO function
    if (typeof setupResult === 'object') {
        //将setup返回的Object对象直接赋值给组件实例的属性对象中
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    //获取组件的vnode
    const Component = instance.type;
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
//可追溯赋值过程,方便维护
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function inject(key, defaultValue) {
    //取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}
function provide(key, value) {
    //存
    //key value 存在组件实例中
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        //当前的provides等于父节点的provides的时候说明是刚初始化，
        //provides优先取当前的provides，取不到就取父节点的provides,原型链继承，当前操作仅在组件初始化的时候执行
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                //先转换虚拟节点vnode
                //component->vnode
                //所有的逻辑都基于vnode进行处理
                //组件转换成虚拟节点
                const vnode = createVNode(rootComponent);
                //渲染虚拟节点到容器中
                render(vnode, rootContainer);
            }
        };
    };
}

function shouldUpdateComponent(prevVnode, nextVnode) {
    //取出前后vnode的props进行比对
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVnode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
let isFlushPending = false;
const p = Promise.resolve();
//添加需要更新的操作放进一个数组，在微任务的任务队列中依次提取出来并执行，最后一次性渲染更新操作
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    //缓存 每次只调用一次nextTick方法更新
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    //提取出所有更新操作去执行
    while (job = queue.shift()) {
        job && job();
    }
}
//支持传入方法以及使用await的方式   nextTick(()=>{})  await nextTick()
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    //渲染
    function render(vnode, container) {
        //patch
        patch(null, vnode, container, null, null);
    }
    //处理节点  n1为老的vnode节点，n2为新的vnode节点
    function patch(n1, n2, container, parentComponent, anchor) {
        //ShapeFlags
        //vnode->flag  标识虚拟节点的类型
        //TODO判断vnode是不是一个element
        //是element就处理element
        const { type, ShapeFlag } = n2;
        //Fragment->只渲染children
        //根据虚拟节点的类型进行判断
        switch (type) {
            case Fragement:
                //渲染插槽或者template模版
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                //渲染无标签的节点
                processText(n1, n2, container);
                break;
            default:
                //渲染组件和正常标签的节点
                //位运算a&b  表示b是否满足a的条件
                if (ShapeFlag & ShapeFlags.ELEMENT) {
                    //处理element
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    //去处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    //处理Fragment  只渲染children 渲染插槽和template里面的数据
    function processFragment(n1, n2, container, parentComponent, anchor) {
        console.log('oldFragment', n1);
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    //处理无标签的节点
    function processText(n1, n2, container) {
        console.log('oldText', n1);
        const { children } = n2;
        //存储该组件实例管理的 DOM 根节点。
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    //处理组件
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //初始化组件
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            //更新组件
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        debugger;
        if (shouldUpdateComponent(n1, n2)) {
            //获取组件实例
            const instance = (n2.component = n1.component);
            //添加更新后的组件实例
            instance.next = n2;
            //更新组件实例
            instance.update();
        }
        else {
            const instance = (n2.component = n1.component);
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    //处理element
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log('patchElement container', container);
        //新旧节点对比
        //获取el n2在初始化的时候可能没有值,直接将n1.el赋值给n2.el
        const el = (n2.el = n1.el);
        //props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        patchProps(el, oldProps, newProps);
        //children
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    //比对新旧props
    //1.新老props不相同且都有值，直接更新props
    //2.新props为null和undefined，直接删除老的props
    //3.新props里面没有老props的某个值，直接把这个值从props里面删除
    function patchProps(el, oldProps, newProps) {
        //老的props和新的props相等不需要去比对
        if (oldProps !== newProps) {
            //遍历新的props，当新旧props不一致就调用hostPatchprop方法更新props
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            //老的props不是空对象才需要遍历老的props
            if (oldProps !== EMPTY_OBJ) {
                //遍历老的props，当老props的值不在新的props中，说明这个props需要被删除
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        //新旧的vnode类型
        const prevShapeFlag = n1.ShapeFlag;
        const nextShapeFlag = n2.ShapeFlag;
        //获取老新vnode的子节点信息
        const c1 = n1.children;
        const c2 = n2.children;
        //vnode节点有文本和数组两种类型，因此比对节点有四种情况
        //1.当新vnode节点是文本类型
        if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            //老vnode节点是数组类型
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                //1.把老vnode节点的children清空  2.将新节点设置成c2
                unmountChildren(n1.children);
                //直接设置新vnode节点为c2
                hostSetElementText(container, c2);
            }
            else {
                //老节点是文本类型,直接将新节点设置成c2
                if (c1 !== c2) {
                    //直接设置新vnode节点为c2
                    hostSetElementText(container, c2);
                }
            }
        }
        else {
            //新节点是个文本节点
            //1.直接清空旧节点的值
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, '');
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                //新老节点都是数组类型 diff算法 双端对比
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    //删除节点
    function unmountChildren(children) {
        //遍历children获取每个子节点的根节点，然后调用hostRemove方法删除这些节点
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            //remove
            hostRemove(el);
        }
    }
    //diff算法
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        function isSameVnodeType(n1, n2) {
            //比对type和key  都相同则默认是一样的节点,才使用patch去更新数据
            return n1.type === n2.type && n1.key === n2.key;
        }
        //1.左侧比对  i 是循环起始下标  e1 和 e2 是老节点和新节点最后的索引下标  AB(C)->AB(DE)
        while (i <= e1 && i <= e2) {
            //取出vnode
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        //2.右侧比对  (A)BC->(DE)BC
        while (i <= e1 && i <= e2) {
            //取出vnode
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        //3.新的vnode节点比老的vnode节点多  当i走到e1节点索引后面并且小于等于e2节点索引，说明现在的c2[i]节点需要添加进去
        //左侧 （AB）->(AB)C  i = 2, e1 = 1, e2 = 2
        //右侧  (AB) -> C(AB)  i = 0, e1 = -1, e2 = 0
        if (i > e1) {
            if (i <= e2) {
                //i+1<c2.length 说明需要添加节点在左侧，反之是需要添加节点在右侧
                const nextPos = e2 + 1;
                const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                while (i <= e2) {
                    //n1为null 表示是插入操作
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            //4.老节点比新节点要多
            //左侧   (AB)C->(AB)  i = 2, e1 = 2, e2 = 1
            //右侧   (A)BC->BC  i = 0, e1 = 0, e2 = -1
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            //乱序 中间对比
            // a,b,(c,e,d),f,g -> a,b,(e,c),f,g
            // 新老节点长度相同左右侧节点相同，中间节点不同
            // s2 新节点起始下标索引
            let s1 = i;
            let s2 = i;
            //需要patch的节点数量
            const toBePatched = e2 - s2 + 1;
            //已经patch完的节点数量
            let patched = 0;
            //定义Map方便查找key
            const keyToNewIndexMap = new Map();
            //设置一个需要patch节点数量的数组 并初始化内部内容全为0
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            //记录是否需要移动
            let moved = false;
            let maxNewIndexSoFar = 0;
            //遍历新节点中间的节点key映射到map里
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            //遍历老节点
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                //当已经处理的节点大于等于需要处理的节点，说明剩下的节点全是多余的节点，就需要直接删除
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                //null undefined
                let newIndex;
                //当老节点的key有值时，去新的节点里面查找它的索引，然后对比新老节点变化
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    //当老节点没有key时，遍历新节点对比老节点查找相同类型相同且都没有key
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVnodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                //如果遍历老节点没找到新节点的NewIndex，说明老节点多余了就需要删除，否则patch方法去比对变化
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    //cde-> newIndex->120 ->ecd
                    //当新节点的索引不大于之前节点的索引 说明需要移动
                    // 相当于判断新节点是不是依次递增的索引表明新节点每个节点整体前后位置没有变化
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    //i+1 是避免当i=0时，这个时候还没有创建映射，newIndexToOldIndexMap默认内容为0，判断会有问题
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    //递增已经处理的节点数量
                    patched++;
                }
            }
            //移动位置 a,b,(c,d,e),f,g  -> a,b,(e,c,d),f,g
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = increasingNewIndexSequence.length - 1;
            //倒序遍历，根据右侧稳定的节点作锚点进行循环插入  AB(CDE)FG->AB(ECD)FG
            for (let i = toBePatched - 1; i >= 0; i--) {
                //获取中间节点的最后一个节点下标和起始节点
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
                //当newIndexToOldIndexMap[i]===0说明这个新的节点没有在老节点中找到，则需要创建一个新节点
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    //递增序列返回的索引和原始节点的索引进行对比
                    // cde->012  ecd->12  e移动到c前面则 cd索引相同不需要移动
                    //如果两者索引不同则说明原始节点当前索引的节点需要移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        //移动位置
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    //挂载element
    function mountElement(vnode, container, parentComponent, anchor) {
        //存储该组件实例管理的 DOM 根节点。
        const el = (vnode.el = hostCreateElement(vnode.type));
        //处理element 子节点
        //子节点 string array
        const { children, ShapeFlag } = vnode;
        if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        }
        else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        //初始化props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        //往anchor锚点前 插入el节点
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        //vnode  多个虚拟节点需要判断子节点是否是组件还是element
        children.forEach((v) => {
            //再次判断子节点是否是组件还是element
            patch(null, v, container, parentComponent, anchor);
        });
    }
    //挂载组件实例 initialVnode 初始化虚拟节点
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        //创建组件实例
        const instance = (initialVnode.component = createComponentInstance(initialVnode, parentComponent));
        //初始化组件props和slot等属性
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    //处理组件虚拟dom vnode的渲染
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        //添加effect主要原因是当响应式对象变更的时候，可以监听到然后调用render函数生成新的vnode进行diff算法
        //更新依赖的方法赋值给组件实例对象的update属性
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log('init');
                const { proxy } = instance;
                //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
                //因此可以直接使用this获取instace中setupState属性中的数据
                //instance.subTree存一下上一个vnode
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                //vnode->patch
                //vnode->element->mountElement
                patch(null, subTree, container, instance, anchor);
                //element->mount 当所有element节点都挂载以后 获取根节点
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log('update');
                //更新组件props 取出当前以及需要更新后的组件实例
                const { next, vnode } = instance;
                //当组件实例有新的需要更新的vnode
                if (next) {
                    next.el = vnode.el;
                    //更新组件实例属性
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                //新的vnode
                const subTree = instance.render.call(proxy, proxy);
                //上一个vnode
                const previousSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(previousSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log('update scheduler');
                //将多个需要更新的操作塞入一个队列，然后一次性更新
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
//更新组件实例属性
function updateComponentPreRender(instance, nextVnode) {
    //1.将新的vnode赋值给组件的vnode  2.将组件实例的next属性赋值为空 3.将新的vnode的props属性赋值给组件实例的props属性
    instance.vnode = nextVnode;
    instance.next = null;
    instance.props = nextVnode.props;
}
//最大递增序列  返回递增序列的下标 例：[2,3,4,1,5]    返回[2,3,4,5]的下标[0,1,2,4]
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
//prevVal为旧的props,nextVal为新的props
function patchProp(el, key, prevVal, nextVal) {
    console.log('旧的props', prevVal);
    //on+Event name 就是点击事件 小写event就是事件名 。
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        //判断是事件就添加事件方法
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        //不是事件说明是props属性，直接添加属性
        //当最新的val值为null或undefined，说明这个属性没有了，就应该删除，否则应该修改
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
//anchor锚地 指定位置
function insert(child, parent, anchor) {
    // parent.append(el)
    //anchor为null 时 默认添加到尾部
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    //找到child的父节点，然后调用父节点的removeChild方法移除child节点
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVNode,
    createRenderer: createRenderer,
    createTextVNode: createTextVNode,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    nextTick: nextTick,
    provide: provide,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
};

var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["INTERPOLATION"] = 0] = "INTERPOLATION";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSION"] = 1] = "SIMPLE_EXPRESSION";
    NodeTypes[NodeTypes["ELEMENT"] = 2] = "ELEMENT";
    NodeTypes[NodeTypes["TEXT"] = 3] = "TEXT";
    NodeTypes[NodeTypes["ROOT"] = 4] = "ROOT";
    NodeTypes[NodeTypes["COMPOUND_EXPRESSION"] = 5] = "COMPOUND_EXPRESSION";
})(NodeTypes || (NodeTypes = {}));
function createVnodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: NodeTypes.ELEMENT,
        tag,
        props,
        children
    };
}

//生成string代码
function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    //生成函数导入代码 例：const { toDisplayString: _toDisplayString } = Vue
    genFunctionPreamble(ast, context);
    const functionName = 'render';
    const args = ['_ctx', '_cache'];
    const signature = args.join(', ');
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = 'Vue';
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')}}=${VueBinging}`);
    }
    push('\n');
    push('return ');
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        //处理string类型
        case NodeTypes.TEXT:
            genText(node, context);
            break;
        //处理插值类型
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context);
            break;
        //处理表达式
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context);
            break;
        //处理标签
        case NodeTypes.ELEMENT:
            genElement(node, context);
            break;
        //处理复合类型
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context);
            break;
    }
}
//处理string类型
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
//处理插值类型
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(`)`);
}
//处理表达式
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
//处理标签
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(')');
}
//假值转换成Null
function genNullable(args) {
    return args.map((arg) => arg || 'null');
}
//将数组转化成string类型，并且连接处添加逗号
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(', ');
        }
    }
}
//处理复合类型
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}

//枚举 开始标签 / 结束标签
var TagType;
(function (TagType) {
    TagType[TagType["Start"] = 0] = "Start";
    TagType[TagType["End"] = 1] = "End";
})(TagType || (TagType = {}));
//基础编译
function baseParse(content) {
    //序列化文本
    const context = createParseContext(content);
    //返回编译后的数据  []存储解析的标签
    return createRoot(parseChildren(context, []));
}
//序列化文本信息
function createParseContext(content) {
    return {
        source: content
    };
}
//创建根文本
function createRoot(children) {
    return {
        children,
        type: NodeTypes.ROOT
    };
}
//解析文本数据  ancestors存储之前解析的标签
function parseChildren(context, ancestors) {
    const nodes = [];
    //没有结束标识时就一直解析
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        //当文本数据是以双大括号为开头的就提取里面的变量
        if (s.startsWith('{{')) {
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            //如果文本数据是以<为开头，说明是一个标签，并且第二个字符是小写字母，说明是一个基础element标签，而不是组件标签
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        //如果不是插值也不是标签开头，那就是普通文本
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    //1.遇到结束标签
    //2.context.source没有值的时候
    const s = context.source;
    if (s.startsWith('</')) {
        //遍历之前存储过的开始标签，比对是否相同，相同则说明需要结束解析
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const currentTag = ancestors[i].tag;
            //tag比对
            if (startsWithEndTagOpen(s, currentTag)) {
                return true;
            }
        }
    }
    return !s;
}
//将element文本标签转换成ast语法树 例：<div>hi,{{message}}</div>
function parseElement(context, ancestors) {
    //解析tag <div></div>
    //开始标签返回标签的ast语法树  文本数据变成</div>
    const element = parseTag(context, TagType.Start);
    //回溯算法
    //存储解析过的标签
    ancestors.push(element);
    //解析标签内的内容
    element.children = parseChildren(context, ancestors);
    //当开始解析闭合标签的时候，弹出之前解析过的开始标签
    ancestors.pop();
    //判断弹出的标签和现在解析的闭合标签是不是一致的，一致说明时对称的，也就可以移除
    if (startsWithEndTagOpen(context.source, element.tag)) {
        //解析闭合的div标签,解析完把闭合标签移除
        parseTag(context, TagType.End);
    }
    else {
        throw new Error('缺少结束标签:' + element.tag);
    }
    //返回开始标签的ast语法树
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return source.startsWith("</") && source.slice(2, 2 + tag.length).toLowerCase() === tag;
}
//解析tag
function parseTag(context, type) {
    //解析开始和闭合的div标签
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    // console.log(match)
    //提取tage div
    const tag = match[1];
    //2.删除处理完成的代码
    // ></div>
    advanceBy(context, match[0].length);
    //</div>
    advanceBy(context, 1);
    //闭合标签 不返回抽象语法树
    if (type === TagType.End)
        return;
    return {
        type: NodeTypes.ELEMENT,
        tag: tag,
        children: [],
    };
}
//解析普通文本内容
function parseText(context) {
    //1.获取当前文本的内容  解析文本的时候,遇到{{双大括号或者<就停止,表示文本内容里面有{{变量}}或者<标签>
    //例：<div><p>hi</p>{{message}}</div>
    let endIndex = context.source.length;
    let endTokens = ['{{', '<'];
    for (let i = 0; i < endTokens.length; i++) {
        //找到最近的{{或者<，记录其下标
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    //2.推进，删除文本内容
    const content = parseTextData(context, endIndex);
    // console.log(context.source)
    return {
        type: NodeTypes.TEXT,
        content: content,
    };
}
//解析提取{{}}双大括号里面的插值变量
function parseInterpolation(context) {
    //{{message}} 解析vue变量
    const openDelLimiter = '{{';
    const closeDelLimiter = '}}';
    //找到}}之前的索引 也就右边双大括号的下标 {{message
    const closeIndex = context.source.indexOf(closeDelLimiter, openDelLimiter.length);
    //推进 相当于拿到 message}}，去掉左边的双大括号
    advanceBy(context, openDelLimiter.length);
    //取到message的长度
    const rawContentLength = closeIndex - openDelLimiter.length;
    //取出messgae的内容
    const rawContent = parseTextData(context, rawContentLength);
    //去除message变量左右的空格
    const content = rawContent.trim();
    //message}}删除右边的双大括号
    advanceBy(context, closeDelLimiter.length);
    //将插值转换成ast语法树
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
        },
    };
}
//推进数据  将已经转换成ast语法树的文本数据丢弃掉
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
//1.获取文本里面的内容  推进数据
function parseTextData(context, length) {
    //截取数据
    const content = context.source.slice(0, length);
    //推进数据
    advanceBy(context, length);
    return content;
}

//root 根节点  options转换器
function transform(root, options = {}) {
    //将root的options和root本身合并
    const context = createTransformContext(root, options);
    //1.遍历：深度优先搜索
    //2.修改text的content
    traverseNode(root, context);
    //root.codegenNode 将数据提取到root.codegenNode中
    createRootCodegen(root);
    //取出所有函数参数
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    //如果是element类型，就取当前节点的codegenNode属性作为root的codegenNode
    if (child.type === NodeTypes.ELEMENT) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        //ast转换方法
        nodeTransforms: options.nodeTransforms || [],
        //存储函数的参数
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}
function traverseNode(node, context) {
    //深度优先遍历
    //取出nodeTransforms  遍历里面的转换方法并执行，那么通过深度优先遍历，实现将指定或者所有node节点逻辑转换，
    const nodeTransforms = context.nodeTransforms;
    //推出插件的方法数组
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        //收集起来
        if (onExit)
            exitFns.push(onExit);
    }
    //根据不同类型进行不同的处理
    switch (node.type) {
        //表达式
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break;
        //Root和标签 需要深度递归遍历子节点
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            transformNode(node, context);
            break;
    }
    //遍历执行推出插件方法
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function transformNode(node, context) {
    const children = node.children;
    //遍历node里面的children，深度优先遍历
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}

function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            //中间处理层
            //tag
            const vnodeTag = `'${node.tag}'`;
            //props
            let vnodeProps;
            //children
            const { children } = node;
            let vnodeChildren = children[0];
            //返回节点所有tag,props,children属性
            node.codegenNode = createVnodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

//转换表达式  给表达式输出添加_ctr.      {{message}} -> _ctr.message
function transformExpression(node) {
    if (node.type === NodeTypes.INTERPOLATION) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

//判断 是否是文本和插槽类型
function isTextNode(node) {
    return (node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION);
}

//复合类型 包含插值和文本 hi,{{message}}
function transformText(node) {
    //当文本和插值相邻时，添加一个+号在两者之间
    if (node.type === NodeTypes.ELEMENT) {
        return () => {
            let currentContainer;
            const { children } = node;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isTextNode(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const nextNode = children[j];
                        if (isTextNode(nextNode)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(nextNode);
                            //推进节点  删除节点
                            children.splice(j, 1);
                            //删除了节点，指针会前进一位，将指针回调
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

//XunBei-Vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

exports.createApp = createApp;
exports.createElementVNode = createVNode;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.toDisplayString = toDisplayString;
