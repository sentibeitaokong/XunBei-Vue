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
        el: null
    };
    //位运算 a｜b  同时满足ab两种条件
    if (typeof children === 'string') {
        vnode.ShapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
    else if (Array.isArray(children)) {
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

//全局变量和函数
const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
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
    $slots: (i) => i.slots
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

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type, //vnode类型
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
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
//可追溯赋值过程,方便维护
function setCurrentInstance(instance) {
    currentInstance = instance;
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
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    //处理无标签的节点
    function processText(n1, n2, container) {
        const { children } = n2;
        //存储该组件实例管理的 DOM 根节点。
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    //处理组件
    function processComponent(n1, n2, container, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor);
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
        //新旧节点对比
        //获取el n2在初始化的时候可能没有值,直接将n1.el赋值给n2.el
        const el = (n2.el = n1.el);
        //props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        console.log('patchComponent');
        console.log('n1:', n1, "n2:", n2);
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
    function unmountChildren(children) {
        //遍历children获取每个子节点的根节点，然后调用hostRemove方法删除这些节点
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            //remove
            hostRemove(el);
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        function isSameVnodeType(n1, n2) {
            //比对type和key  都相同则默认是一样的节点,才使用patch去更新数据
            return n1.type === n2.type && n1.key === n2.key;
        }
        //1.左侧比对  i 是循环起始下标  e1 和 e2 是老节点和新节点最后的索引下标
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
        //2.右侧比对
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
        if (i > e1) {
            if (i <= e2) {
                //i+1<c2.length 说明需要添加节点在左侧，反之是需要添加节点在右侧
                const nextPos = i + 1;
                debugger;
                const anchor = i + 1 < c2.length ? c2[nextPos].el : null;
                patch(null, c2[i], container, parentComponent, anchor);
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
        //props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
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
        const instance = createComponentInstance(initialVnode, parentComponent);
        //初始化组件
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    //处理组件虚拟dom vnode的渲染
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        //添加effect主要原因是当响应式对象变更的时候，可以监听到然后调用render函数生成新的vnode进行diff算法
        effect(() => {
            if (!instance.isMounted) {
                console.log('init');
                const { proxy } = instance;
                //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
                //因此可以直接使用this获取instace中setupState属性中的数据
                //instance.subTree存一下上一个vnode
                const subTree = (instance.subTree = instance.render.call(proxy));
                //vnode->patch
                //vnode->element->mountElement
                patch(null, subTree, container, instance, anchor);
                //element->mount 当所有element节点都挂载以后 获取根节点
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log('update');
                const { proxy } = instance;
                //新的vnode
                const subTree = instance.render.call(proxy);
                //上一个vnode
                const previousSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(previousSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}

function createElement(type) {
    return document.createElement(type);
}
//prevVal为旧的props,nextVal为新的props
function patchProp(el, key, prevVal, nextVal) {
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

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };
