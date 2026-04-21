import {createApp} from "../../dist/XunBei-Vue.esm.js";
import {App} from "./App.js";
//vue3
const rootContainer = document.querySelector('#app');
createApp(App).mount(rootContainer)