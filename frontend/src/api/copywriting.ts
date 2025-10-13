import api from './index'
import { useAIStore } from '@/stores/ai'

// 获取当前激活的AI配置头信息
const getActiveAIHeaders = () => {
  try {
    const aiStore = useAIStore()
    const current = aiStore.currentConfig
    
    // 如果没有激活的配置，返回空对象（让后端从数据库获取）
    if (!current) return {}
    
    // 传递配置信息到请求头（作为备用）
    const headers: Record<string, string> = {}
    if (current.apiKey) headers['X-AI-Key'] = current.apiKey
    if (current.baseUrl) headers['X-AI-Base-Url'] = current.baseUrl
    if (current.model) headers['X-AI-Model'] = current.model
    
    return headers
  } catch (error) {
    return {}
  }
}

export interface DeconstructRequest {
  content: string
  videoUrl?: string
  industry?: string
}

export interface CreateRequest {
  reference?: string
  content: string
}

export interface RewriteRequest {
  referenceId?: string
  referenceContent?: string
  newContent: string
  rewriteType: 'structure' | 'style' | 'hook' | 'mixed'
}

// 文案拆解（只进行AI分析，不保存）
export const deconstructCopywriting = (data: DeconstructRequest) => {
  return api.post('/copywriting/deconstruct', data, { headers: getActiveAIHeaders() })
}

// 保存拆解结果到数据库
export const saveDeconstructionResult = (data: any) => {
  return api.post('/copywriting/save-deconstruction', data)
}

// 分析文案
export const analyzeCopywriting = (content: string) => {
  return api.post('/copywriting/analyze', { content }, { headers: getActiveAIHeaders() })
}

// 优化文案
export const optimizeCopywriting = (content: string) => {
  return api.post('/copywriting/optimize', { content }, { headers: getActiveAIHeaders() })
}

// 创作文案
export const createCopywriting = (data: CreateRequest) => {
  return api.post('/copywriting/create', data, { headers: getActiveAIHeaders() })
}

// 仿写文案
export const rewriteCopywriting = (data: RewriteRequest) => {
  return api.post('/copywriting/rewrite', data, { headers: getActiveAIHeaders() })
}

// 获取文案列表
export const getCopywritings = (params?: any) => {
  return api.get('/copywriting', { params })
}

// 获取文案详情
export const getCopywritingById = (id: string) => {
  return api.get(`/copywriting/${id}`)
}

// 保存文案
export const saveCopywriting = (data: any) => {
  return api.post('/copywriting', data)
}

// 删除文案
export const deleteCopywriting = (id: string) => {
  return api.delete(`/copywriting/${id}`)
}




