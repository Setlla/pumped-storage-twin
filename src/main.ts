import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import DataVVue3 from '@kjgl77/datav-vue3'
import 'element-plus/dist/index.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.use(DataVVue3)
app.mount('#app')
