import api from './index'

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
  return api.post('/copywriting/deconstruct', data)
}

// 保存拆解结果到数据库
export const saveDeconstructionResult = (data: any) => {
  return api.post('/copywriting/save-deconstruction', data)
}

// 分析文案
export const analyzeCopywriting = (content: string) => {
  return api.post('/copywriting/analyze', { content })
}

// 优化文案
export const optimizeCopywriting = (content: string) => {
  return api.post('/copywriting/optimize', { content })
}

// 创作文案
export const createCopywriting = (data: CreateRequest) => {
  return api.post('/copywriting/create', data)
}

// 仿写文案（只生成，不保存）
export const rewriteCopywriting = (data: RewriteRequest) => {
  return api.post('/copywriting/rewrite', data)
}

// 保存仿写结果到数据库
export const saveRewriteResult = (data: any) => {
  return api.post('/copywriting/save-rewrite', data)
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



