import api from './index'

export interface Category {
  id: string
  name: string
  value: string
  sortOrder: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// 获取所有分类
export const getCategories = () => {
  return api.get('/category')
}

// 创建分类
export const createCategory = (data: { name: string; value: string; sortOrder?: number }) => {
  return api.post('/category', data)
}

// 更新分类
export const updateCategory = (id: string, data: { name?: string; value?: string; sortOrder?: number }) => {
  return api.put(`/category/${id}`, data)
}

// 删除分类
export const deleteCategory = (id: string) => {
  return api.delete(`/category/${id}`)
}

// 初始化默认分类
export const initDefaultCategories = () => {
  return api.post('/category/init')
}

