import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAIStore } from '@/stores/ai'
import { useCategoryStore } from '@/stores/category'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 全局初始化 AI 配置（从 localStorage 恢复）
const aiStore = useAIStore()
aiStore.initFromStorage()

// 全局初始化分类数据
const categoryStore = useCategoryStore()
categoryStore.loadCategories()

app.mount('#app')





