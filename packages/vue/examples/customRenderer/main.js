import { createRenderer } from "../../../../lib/XunBei-Vue.esm.js";
import { App } from "./App.js";

const app = new PIXI.Application();

// 异步初始化
await app.init({
    width: 800,
    height: 600,
});

// 添加到页面
document.body.appendChild(app.canvas);

const renderer = createRenderer({
  createElement(type) {
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.fill(0xff0000);
      rect.rect(0, 0, 100, 100);
      rect.fill();

      return rect;
    }
  },
  patchProp(el, key, val) {
    el[key] = val;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});


renderer.createApp(App).mount(app.stage);