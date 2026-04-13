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

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

//全局变量和函数
const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === 'object';
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
//触发收集依赖
const targetMap = new Map();
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

function createComponentInstance(vnode, parent) {
    console.log('parentComponent', parent);
    const component = {
        vnode,
        type: vnode.type, //vnode类型
        setupState: {}, //setup方法里面返回的属性
        props: {},
        slots: {},
        provides: parent ? parent.provides : {}, //provide数据
        parent, //父组件 vnode
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
        instance.setupState = setupResult;
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

//渲染
function render(vnode, container) {
    //patch
    patch(vnode, container, null);
}
//处理节点
function patch(vnode, container, parentComponent) {
    //ShapeFlags
    //vnode->flag  标识虚拟节点的类型
    //TODO判断vnode是不是一个element
    //是element就处理element
    const { type, ShapeFlag } = vnode;
    //Fragment->只渲染children
    //根据虚拟节点的类型进行判断
    switch (type) {
        case Fragement:
            //渲染插槽或者template模版
            processFragment(vnode, container, parentComponent);
            break;
        case Text:
            //渲染无标签的节点
            processText(vnode, container);
            break;
        default:
            //渲染组件和正常标签的节点
            //位运算a&b  表示b是否满足a的条件
            if (ShapeFlag & ShapeFlags.ELEMENT) {
                //处理element
                processElement(vnode, container, parentComponent);
            }
            else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                //去处理组件
                processComponent(vnode, container, parentComponent);
            }
            break;
    }
}
//处理Fragment  只渲染children 渲染插槽和template里面的数据
function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
}
//处理无标签的节点
function processText(vnode, container) {
    const { children } = vnode;
    //存储该组件实例管理的 DOM 根节点。
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
}
//处理组件
function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent);
}
//处理element
function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
}
//挂载element
function mountElement(vnode, container, parentComponent) {
    //存储该组件实例管理的 DOM 根节点。
    const el = (vnode.el = document.createElement(vnode.type));
    //处理element 子节点
    //子节点 string array
    const { children, ShapeFlag } = vnode;
    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children;
    }
    else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el, parentComponent);
    }
    //props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        //on+Event name 就是点击事件 小写event就是事件名
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container, parentComponent) {
    //vnode  多个虚拟节点需要判断子节点是否是组件还是element
    vnode.children.forEach((v) => {
        //再次判断子节点是否是组件还是element
        patch(v, container, parentComponent);
    });
}
//挂载组件实例 initialVnode 初始化虚拟节点
function mountComponent(initialVnode, container, parentComponent) {
    //创建组件实例
    const instance = createComponentInstance(initialVnode, parentComponent);
    //初始化组件
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
}
//处理组件虚拟dom vnode的渲染
function setupRenderEffect(instance, initialVnode, container) {
    const { proxy } = instance;
    //修改指向  将setup方法返回值的值存进虚拟dom实例instance的setupState属性中，然后将setupState中的数据指向instace.proxy中
    //因此可以直接使用this获取instace中setupState属性中的数据
    const subTree = instance.render.call(proxy);
    //vnode->patch
    //vnode->element->mountElement
    patch(subTree, container, instance);
    //element->mount 当所有element节点都挂载以后 获取根节点
    initialVnode.el = subTree.el;
}

function createApp(rootComponent) {
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
        //provides优先取当前的provides，取不到就取父节点的provides,当前操作仅在组件初始化的时候执行
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.renderSlots = renderSlots;
