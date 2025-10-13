import api from './index'

export interface PromptsPayload {
  system?: string
  deconstruct?: string
  analyze?: string
  rewriteStructure?: string
  rewriteStyle?: string
  rewriteHook?: string
  rewriteMixed?: string
  optimize?: string
}

export const getPrompts = async (): Promise<PromptsPayload> => {
  const res = await api.get('/settings/prompts')
  return res.data
}

export const savePrompts = async (payload: PromptsPayload): Promise<void> => {
  await api.put('/settings/prompts', payload)
}


