import api from '.'

export interface AIConfigDto {
  provider: string
  providerName: string
  model: string
  modelName: string
  apiKey: string
  baseUrl: string
  isActive?: boolean
}

export interface AIConfig extends AIConfigDto {
  id: string
  createdAt: string
  updatedAt: string
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

// 获取单个配置
export const getAIConfig = async (id: string): Promise<AIConfig> => {
  return await api.get(`/ai-config/${id}`)
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
