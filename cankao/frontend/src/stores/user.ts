import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  username: string
  role: string
  status: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  // 从 localStorage 初始化
  const initFromStorage = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken) {
      token.value = storedToken
    }
    
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        // 解析失败
      }
    }
  }

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isApproved = computed(() => user.value?.status === 'approved')

  // 登录
  const login = (userData: User, accessToken: string) => {
    user.value = userData
    token.value = accessToken
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  // 登出
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // 清理所有业务数据缓存，避免切换用户时出现数据混乱
    clearAllStoresCache()
  }
  
  // 清理所有 stores 的缓存数据
  const clearAllStoresCache = () => {
    // 导入其他 stores 会在下面动态处理，这里提供一个全局清理方法
    // 清理 AI 相关的 localStorage 数据
    localStorage.removeItem('ai_provider_models')
    localStorage.removeItem('ai_provider_drafts')
    localStorage.removeItem('ai_tested_connections')
  }

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...userData }
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isApproved,
    initFromStorage,
    login,
    logout,
    updateUser,
    clearAllStoresCache
  }
})

