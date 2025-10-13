import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  createAIConfig,
  getAllAIConfigs,
  getActiveAIConfig,
  updateAIConfig,
  setActiveAIConfig,
  deleteAIConfig,
  type AIConfig,
  type AIConfigDto
} from '@/api/ai-config'

export interface AIModel {
  label: string
  value: string
  description: string
}

// AI 服务商配置
export const providerConfigs: Record<string, {
  name: string
  baseUrl: string
  models: AIModel[]
  apiKeyLink: string
}> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyLink: 'https://platform.openai.com/api-keys',
    models: []
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyLink: 'https://dashscope.console.aliyun.com/apiKey',
    models: []
  },
  wenxin: {
    name: '文心一言',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    apiKeyLink: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    models: []
  },
  zhipu: {
    name: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyLink: 'https://open.bigmodel.cn/usercenter/apikeys',
    models: []
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyLink: 'https://platform.deepseek.com/api_keys',
    models: []
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiKeyLink: 'https://aistudio.google.com/apikey',
    models: []
  }
}

export const useAIStore = defineStore('ai', () => {
  // 所有已保存的 AI 配置（从后端加载）
  const savedConfigs = ref<AIConfig[]>([])

  // 当前激活的配置
  const currentConfig = ref<AIConfig | null>(null)

  // 每个厂商的模型列表（刷新列表后缓存到localStorage）
  const providerModels = ref<Record<string, AIModel[]>>({})

  // 未保存前的临时草稿（按厂商），用于在切换模型或刷新列表时保留用户输入（不再用于自动回填敏感信息）
  const providerDrafts = ref<Record<string, { apiKey?: string; baseUrl?: string }>>({})

  // 从后端加载所有AI配置
  const loadConfigs = async () => {
    try {
      const configs = await getAllAIConfigs()
      savedConfigs.value = configs

      // 加载当前激活的配置
      const active = await getActiveAIConfig()
      currentConfig.value = active
    } catch (error) {
      // 加载配置失败
      savedConfigs.value = []
      currentConfig.value = null
    }
  }

  // 从localStorage初始化模型列表和草稿
  const initFromStorage = () => {
    const modelsJson = localStorage.getItem('ai_provider_models')
    if (modelsJson) {
      try {
        providerModels.value = JSON.parse(modelsJson)
      } catch (e) {
        // 解析失败
        providerModels.value = {}
      }
    }

    const drafts = localStorage.getItem('ai_provider_drafts')
    if (drafts) {
      try {
        providerDrafts.value = JSON.parse(drafts)
      } catch (e) {
        // 解析失败
        providerDrafts.value = {}
      }
    }
  }

  // 保存模型列表和草稿到localStorage
  const saveToStorage = () => {
    localStorage.setItem('ai_provider_models', JSON.stringify(providerModels.value))
    localStorage.setItem('ai_provider_drafts', JSON.stringify(providerDrafts.value))
  }

  // 创建或更新配置
  const saveConfig = async (config: AIConfigDto) => {
    try {
      // 检查是否已存在相同provider+model的配置
      const existing = savedConfigs.value.find(
        c => c.provider === config.provider && c.model === config.model
      )

      if (existing) {
        // 更新现有配置
        const updated = await updateAIConfig(existing.id, config)
        const index = savedConfigs.value.findIndex(c => c.id === existing.id)
        if (index >= 0) {
          savedConfigs.value[index] = updated
        }
        // 如果设置为激活，更新当前配置
        if (config.isActive) {
          currentConfig.value = updated
        }
      } else {
        // 创建新配置，默认设为激活
        const created = await createAIConfig({ ...config, isActive: true })
        savedConfigs.value.push(created)
        currentConfig.value = created
      }
    } catch (error) {
      // 保存失败
      throw error
    }
  }

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      await deleteAIConfig(id)
      savedConfigs.value = savedConfigs.value.filter(c => c.id !== id)

      // 如果删除的是当前配置，清除当前配置
      if (currentConfig.value?.id === id) {
        currentConfig.value = savedConfigs.value.find(c => c.isActive) || null
      }
    } catch (error) {
      // 删除失败
      throw error
    }
  }

  // 设置当前使用的配置
  const setCurrentConfig = async (id: string) => {
    try {
      const updated = await setActiveAIConfig(id)
      currentConfig.value = updated

      // 更新列表中的激活状态
      savedConfigs.value = savedConfigs.value.map(c => ({
        ...c,
        isActive: c.id === id
      }))
    } catch (error) {
      // 设置失败
      throw error
    }
  }

  // 保存某厂商刷新后的模型列表
  const saveProviderModels = (provider: string, models: AIModel[]) => {
    providerModels.value[provider] = models
    providerConfigs[provider] = { ...providerConfigs[provider], models }
    saveToStorage()
  }

  // 写入/合并厂商草稿（不影响正式保存）
  const setProviderDraft = (provider: string, draft: { apiKey?: string; baseUrl?: string }) => {
    providerDrafts.value[provider] = {
      ...providerDrafts.value[provider],
      ...draft,
    }
    saveToStorage()
  }

  // 获取配置列表（用于下拉选择）
  const configOptions = computed(() => {
    return savedConfigs.value.map(config => ({
      label: `${config.providerName} - ${config.modelName}`,
      value: config.id
    }))
  })

  // 检查是否有可用配置
  const hasConfigs = computed(() => savedConfigs.value.length > 0)

  // 当前配置的ID
  const currentConfigId = computed(() => currentConfig.value?.id || '')

  // 测试连接记录（用于"已连接"列表）- 持久化在 localStorage
  const testedConnections = ref<any[]>([])

  // 添加或更新测试连接记录
  const loadTestedConnections = () => {
    try {
      const raw = localStorage.getItem('ai_tested_connections')
      if (raw) testedConnections.value = JSON.parse(raw)
    } catch { testedConnections.value = [] }
  }

  const saveTestedConnections = () => {
    localStorage.setItem('ai_tested_connections', JSON.stringify(testedConnections.value))
  }

  const upsertTestedConnection = (conn: any) => {
    const idx = testedConnections.value.findIndex(c => c.provider === conn.provider && c.model === conn.model)
    const record = { ...conn, testedAt: Date.now() }
    if (idx >= 0) testedConnections.value[idx] = record
    else testedConnections.value.push(record)
    saveTestedConnections()
  }

  // 将已保存的配置同步到已测试连接列表
  const hydrateTestedConnectionsFromSaved = () => {
    savedConfigs.value.forEach(config => {
      const exists = testedConnections.value.some(
        c => c.provider === config.provider && c.model === config.model
      )
      if (!exists) {
        testedConnections.value.push({
          provider: config.provider,
          model: config.model,
          providerName: config.providerName,
          modelName: config.modelName,
          baseUrl: config.baseUrl,
          testedAt: Date.now()
        })
      }
    })
    saveTestedConnections()
  }
  
  // 重置所有状态（用于切换用户或登出）
  const resetStore = () => {
    savedConfigs.value = []
    currentConfig.value = null
    providerModels.value = {}
    providerDrafts.value = {}
    testedConnections.value = []
    // 清理 localStorage
    localStorage.removeItem('ai_provider_models')
    localStorage.removeItem('ai_provider_drafts')
    localStorage.removeItem('ai_tested_connections')
  }

  return {
    savedConfigs,
    currentConfig,
    currentConfigId,
    providerModels,
    providerDrafts,
    testedConnections,
    configOptions,
    hasConfigs,
    loadConfigs,
    initFromStorage,
    loadTestedConnections,
    saveConfig,
    deleteConfig,
    setCurrentConfig,
    saveProviderModels,
    setProviderDraft,
    upsertTestedConnection,
    hydrateTestedConnectionsFromSaved,
    resetStore
  }
})
