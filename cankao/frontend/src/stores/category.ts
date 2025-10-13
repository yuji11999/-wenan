import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCategories, type Category } from '@/api/category'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  // 分类选项（用于下拉框）
  const categoryOptions = computed(() => {
    return categories.value.map(cat => ({
      label: cat.name,
      value: cat.value
    }))
  })

  // 默认分类名称映射（作为后备方案）
  const defaultCategoryNames: Record<string, string> = {
    'food': '美食餐饮',
    'education': '教育培训',
    'tech': '科技数码',
    'lifestyle': '生活日常',
    'fashion': '时尚美妆',
    'health': '健康养生',
    'finance': '金融理财',
    'entertainment': '娱乐影视',
    'realestate': '房产家居',
    'travel': '旅游出行',
    'other': '其他'
  }

  // 根据value获取分类名称
  const getCategoryName = (value: string) => {
    const category = categories.value.find(cat => cat.value === value)
    return category ? category.name : (defaultCategoryNames[value] || value)
  }

  // 加载分类列表
  const loadCategories = async () => {
    loading.value = true
    try {
      const response = await getCategories()
      // 后端直接返回数组，不是 {data: []} 格式
      if (Array.isArray(response)) {
        categories.value = response as Category[]
      } else if (response?.data && Array.isArray(response.data)) {
        // 兼容 {data: []} 格式
        categories.value = response.data as Category[]
      } else {
        // 使用空数组
        categories.value = []
      }
    } catch (error) {
      // 加载失败
      // 发生错误时设置为空数组，避免应用崩溃
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  // 刷新分类列表
  const refreshCategories = async () => {
    await loadCategories()
  }
  
  // 重置状态（用于切换用户或登出）
  const resetStore = () => {
    categories.value = []
    loading.value = false
  }

  return {
    categories,
    loading,
    categoryOptions,
    getCategoryName,
    loadCategories,
    refreshCategories,
    resetStore
  }
})

