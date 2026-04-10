var ShapeFlags;
(function (ShapeFlags) {
    //位运算  a|b  ab同时满足  a&b  b满足a的条件
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["STATEFUL_COMPONENT"] = 2] = "STATEFUL_COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 4] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 8] = "ARRAY_CHILDREN";
})(ShapeFlags || (ShapeFlags = {}));

//创建虚拟节点
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
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT;
}

//便于处理其他属性
const PublicPropertiesMap = {
    $el: (i) => i.vnode.el
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        //setupState
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        //key -> $el   如果是通过$el去取值
        const publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

//组件实例属性
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
    };
    return component;
}
//初始化组件
function setupComponent(instance) {
    //TODO
    //initProps
    //initSlots
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
        //setup方法有function和object两种返回值
        //1.function直接作为render函数渲染组件
        //2.object 则直接充当组件实例中的属性
        //获取setup中的返回值
        const setupResult = setup();
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

//渲染
function render(vnode, container) {
    //patch
    patch(vnode, container);
}
//处理节点
function patch(vnode, container) {
    //ShapeFlags
    //vnode->flag  标识虚拟节点的类型
    //TODO判断vnode是不是一个element
    //是element就处理element
    const { ShapeFlag } = vnode;
    //位运算a&b  表示b是否满足a的条件
    if (ShapeFlag & ShapeFlags.ELEMENT) {
        //处理element
        processElement(vnode, container);
    }
    else if (ShapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        //去处理组件
        processComponent(vnode, container);
    }
}
//处理组件
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
//处理element
function processElement(vnode, container) {
    mountElement(vnode, container);
}
//挂载element
function mountElement(vnode, container) {
    //存储该组件实例管理的 DOM 根节点。
    const el = (vnode.el = document.createElement(vnode.type));
    //处理element 子节点
    //子节点 string array
    const { children, ShapeFlag } = vnode;
    if (ShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children;
    }
    else if (ShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(vnode, el);
    }
    //props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    //vnode  多个虚拟节点需要判断子节点是否是组件还是element
    vnode.children.forEach((v) => {
        //再次判断子节点是否是组件还是element
        patch(v, container);
    });
}
//挂载组件实例 initialVnode 初始化虚拟节点
function mountComponent(initialVnode, container) {
    //创建组件实例
    const instance = createComponentInstance(initialVnode);
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
    patch(subTree, container);
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

export { createApp, h };
