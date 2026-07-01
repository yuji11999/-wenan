import api from '.'

export interface AIConfigDto {
  provider: string
  providerName: string
  model: string
  modelName: string
  apiKey?: string
  baseUrl: string
  isActive?: boolean
}

export interface AIConfig {
  id: string
  provider: string
  providerName: string
  model: string
  modelName: string
  baseUrl: string
  isActive?: boolean
  createdAt: string
  updatedAt: string
  hasApiKey: boolean
  needsRekey?: boolean
}

export interface AIModelOption {
  label: string
  value: string
  description: string
}

export interface AIProbePayload {
  configId?: string
  provider?: string
  baseUrl?: string
  apiKey?: string
}

// 创建AI配置
export const createAIConfig = async (data: AIConfigDto): Promise<AIConfig> => {
  return await api.post('/ai-config', data)
}

// 获取所有AI配置
export const getAllAIConfigs = async (): Promise<AIConfig[]> => {
  return await api.get('/ai-config')
}

// 获取当前激活的配置
export const getActiveAIConfig = async (): Promise<AIConfig | null> => {
  return await api.get('/ai-config/active')
}

// 更新AI配置
export const updateAIConfig = async (
  id: string,
  data: Partial<AIConfigDto>
): Promise<AIConfig> => {
  return await api.put(`/ai-config/${id}`, data)
}

// 设置为激活配置
export const setActiveAIConfig = async (id: string): Promise<AIConfig> => {
  return await api.put(`/ai-config/${id}/activate`, {})
}

// 删除AI配置
export const deleteAIConfig = async (id: string): Promise<{ message: string }> => {
  return await api.delete(`/ai-config/${id}`)
}

// 通过后端获取模型列表，避免浏览器直连供应商暴露 API Key
export const fetchAIModels = async (data: AIProbePayload): Promise<AIModelOption[]> => {
  return await api.post('/ai-config/models', data)
}

// 通过后端测试连接，已保存配置只传 configId
export const testAIConfig = async (
  data: AIProbePayload
): Promise<{ connected: boolean; models?: AIModelOption[]; message?: string }> => {
  return await api.post('/ai-config/test', data)
}
