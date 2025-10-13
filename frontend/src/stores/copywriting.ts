import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCopywritings } from '@/api/copywriting'

export interface Copywriting {
  id: string
  title: string
  content: string
  industry: string
  sourceType: 'original' | 'rewrite' | 'revision'
  sourceId?: string
  isPublic: boolean
  shareStatus: 'none' | 'pending' | 'approved' | 'rejected'
  isSystemMaterial: boolean
  viewCount?: number
  rewriteCount?: number
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    username: string
  }
}

export interface Analysis {
  id: string
  copywritingId: string
  originalText: string
  topic: string
  hook: string
  goldenSentence: string
  adPlacement: string
  content: string
  tags: string[]
  industry: string
  isModified: boolean
}

export const useCopywritingStore = defineStore('copywriting', () => {
  const copywritings = ref<Copywriting[]>([])
  const analyses = ref<Analysis[]>([])
  const loading = ref(false)
  const lastLoadTime = ref<number>(0)
  const CACHE_DURATION = 2 * 60 * 1000 // 2分钟缓存（更短的缓存时间，提升数据新鲜度）
  const needsRefresh = ref(false) // 标记是否需要刷新数据

  // 从后端加载所有文案（带缓存）
  const loadCopywritings = async (forceReload = false) => {
    const now = Date.now()
    
    // 如果标记了需要刷新，强制重新加载
    if (needsRefresh.value) {
      forceReload = true
      needsRefresh.value = false
    }
    
    // 如果不是强制刷新且缓存未过期，直接返回
    if (!forceReload && copywritings.value.length > 0 && (now - lastLoadTime.value) < CACHE_DURATION) {
      return
    }

    // 如果正在加载中，避免重复请求
    if (loading.value) {
      return
    }

    loading.value = true
    try {
      const result = await getCopywritings()
      if (result && Array.isArray(result)) {
        copywritings.value = result
        lastLoadTime.value = now
      }
    } catch (error) {
      // 加载失败
      copywritings.value = []
    } finally {
      loading.value = false
    }
  }

  const addCopywriting = (copywriting: Copywriting) => {
    copywritings.value.unshift(copywriting) // 添加到开头，保持最新的在前
    lastLoadTime.value = Date.now() // 更新缓存时间
  }
  
  // 标记数据已变更，下次加载时需要刷新
  const markAsStale = () => {
    needsRefresh.value = true
  }

  const addAnalysis = (analysis: Analysis) => {
    analyses.value.push(analysis)
  }

  // 强制刷新数据
  const refreshCopywritings = async () => {
    await loadCopywritings(true)
  }

  // 清除缓存（用于切换用户或登出）
  const clearCache = () => {
    copywritings.value = []
    analyses.value = []
    lastLoadTime.value = 0
  }
  
  // 重置所有状态（更彻底的清理）
  const resetStore = () => {
    copywritings.value = []
    analyses.value = []
    lastLoadTime.value = 0
    loading.value = false
    needsRefresh.value = false
  }

  const getCopywritingById = (id: string) => {
    return copywritings.value.find(c => c.id === id)
  }

  const getAnalysisByCopywritingId = (copywritingId: string) => {
    return analyses.value.find(a => a.copywritingId === copywritingId)
  }

  return {
    copywritings,
    analyses,
    loading,
    loadCopywritings,
    refreshCopywritings,
    clearCache,
    resetStore,
    addCopywriting,
    addAnalysis,
    getCopywritingById,
    getAnalysisByCopywritingId,
    markAsStale
  }
})





