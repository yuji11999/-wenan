<template>
  <div class="library-page">
    <h1 class="page-title">📚 素材库</h1>

    <!-- 搜索和筛选 -->
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索文案..."
        size="large"
        style="max-width: 400px"
      >
        <template #prefix>
          <span>🔍</span>
        </template>
      </el-input>

      <div class="filter-group">
        <el-select 
          v-model="filterIndustry" 
          placeholder="全部分类" 
          style="width: 160px"
        >
          <el-option
            label="全部分类"
            value=""
          />
          <el-option
            v-for="cat in categoryStore.categoryOptions"
            :key="cat.value"
            :label="cat.label"
            :value="cat.value"
          />
        </el-select>

        <el-select 
          v-model="sortBy" 
          placeholder="最新创建"
          style="width: 160px"
        >
          <el-option label="最新创建" value="created" />
          <el-option label="最近更新" value="updated" />
          <el-option label="仿写次数" value="rewrite" />
        </el-select>

        <el-select 
          v-model="filterType" 
          placeholder="全部文案"
          style="width: 160px"
        >
          <el-option label="全部文案" value="" />
          <el-option label="我的文案" value="mine" />
          <el-option label="共享文案" value="shared" />
          <el-option label="系统素材" value="system" />
        </el-select>

        <el-button 
          @click="refreshData" 
          :loading="copywritingStore.loading"
          size="large"
          type="primary"
          plain
        >
          <span v-if="!copywritingStore.loading">🔄</span>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选状态显示 -->
    <div class="filter-status">
      <div class="status-info">
        <span class="result-count">
          共找到 {{ filteredCopywritings.length }} 个文案
          <template v-if="copywritingStore.copywritings.length !== filteredCopywritings.length">
            （总共 {{ copywritingStore.copywritings.length }} 个）
          </template>
        </span>
        <!-- 批量操作按钮 -->
        <div v-if="selectedItems.length > 0" class="batch-actions">
          <span class="selected-count">已选择 {{ selectedItems.length }} 个</span>
          <el-button size="small" type="danger" @click="batchDelete">
            批量删除
          </el-button>
          <el-button size="small" @click="clearSelection">
            取消选择
          </el-button>
        </div>
      </div>
      <div class="active-filters" v-if="filterIndustry || sortBy !== 'created' || filterType">
        <span class="filter-label">当前筛选：</span>
        <el-tag v-if="filterIndustry" closable @close="filterIndustry = ''" type="primary" size="small">
          行业：{{ categoryStore.getCategoryName(filterIndustry) }}
        </el-tag>
        <el-tag v-if="filterType" closable @close="filterType = ''" type="success" size="small">
          类型：{{ getTypeLabel(filterType) }}
        </el-tag>
        <el-tag v-if="sortBy !== 'created'" type="info" size="small">
          排序：{{ getSortLabel(sortBy) }}
        </el-tag>
      </div>
    </div>

    <!-- 文案列表 -->
    <div v-if="copywritingStore.loading" class="loading-state">
      <el-skeleton :rows="3" animated />
      <el-skeleton :rows="3" animated />
      <el-skeleton :rows="3" animated />
    </div>
    
    <div v-else-if="filteredCopywritings.length === 0" class="empty-state">
      <div class="emoji">📝</div>
      <p>
        <template v-if="searchKeyword || filterIndustry || filterType">
          未找到符合条件的文案素材
        </template>
        <template v-else>
          暂无文案素材
        </template>
      </p>
      <el-button v-if="searchKeyword || filterIndustry || filterType" @click="clearFilters" type="primary" plain>
        清除筛选条件
      </el-button>
    </div>

    <div v-else class="copywriting-grid">
      <div
        v-for="item in filteredCopywritings"
        :key="item.id"
        class="copywriting-card"
        :class="{ 'is-selected': isSelected(item.id) }"
      >
        <!-- 多选复选框 - 只有自己的素材才能选择 -->
        <el-checkbox 
          v-if="canDelete(item)"
          :model-value="isSelected(item.id)"
          @change="toggleSelect(item.id)"
          class="card-checkbox"
          @click.stop
        />

        <div class="card-header">
          <h3>{{ item.title }}</h3>
          <span class="source-badge" :class="item.sourceType">
            {{ getSourceTypeLabel(item.sourceType) }}
          </span>
        </div>

        <p class="content-preview">{{ item.content.substring(0, 150) }}...</p>
        
        <div v-if="item.user && !isCurrentUser(item)" class="author-info">
          <span class="author-label">作者：{{ item.user.username }}</span>
        </div>

        <div class="card-footer">
          <div class="tags">
            <span class="tag">{{ categoryStore.getCategoryName(item.industry) }}</span>
            <span class="tag visibility-tag" :class="getVisibilityTagClass(item)">
              {{ getVisibilityLabel(item) }}
            </span>
            <span v-if="item.isSystemMaterial" class="tag system-tag">
              系统素材
            </span>
          </div>
          <div class="actions">
            <el-button size="small" @click="viewDetail(item.id)">查看</el-button>
            <el-button size="small" type="primary" @click="rewriteItem(item.id)">
              仿写
            </el-button>
            <!-- 删除按钮 - 只有自己的素材才能删除 -->
            <el-button 
              v-if="canDelete(item)" 
              size="small" 
              type="danger" 
              @click.stop="deleteItem(item.id)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情对话框 - 简洁版 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="文案详情"
      width="800px"
      :close-on-click-modal="false"
      class="detail-dialog"
    >
      <div v-if="currentDetail" class="detail-content">
        <!-- 标题 -->
        <div class="title-section">
          <h4 class="section-label">标题</h4>
          <div class="title-text">{{ currentDetail.title }}</div>
        </div>

        <!-- 分隔线 -->
        <div class="divider"></div>

        <!-- 文案内容 -->
        <div class="content-section">
          <h4 class="section-label">文案</h4>
          <div class="copywriting-content">
            {{ currentDetail.content }}
          </div>
        </div>

        <!-- 拆解信息（如果有） -->
        <div v-if="currentDetail.analysis" class="analysis-section">
          <h4 class="section-title">拆解分析</h4>
          
          <div class="analysis-list">
            <div class="analysis-row" v-if="currentDetail.analysis.topic">
              <span class="row-label">话题：</span>
              <span class="row-value">{{ currentDetail.analysis.topic }}</span>
            </div>

            <div class="analysis-row" v-if="currentDetail.analysis.hook">
              <span class="row-label">钩子：</span>
              <span class="row-value">{{ currentDetail.analysis.hook }}</span>
            </div>

            <div class="analysis-row" v-if="currentDetail.analysis.goldenSentence">
              <span class="row-label">金句：</span>
              <span class="row-value">{{ currentDetail.analysis.goldenSentence }}</span>
            </div>

            <div class="analysis-row" v-if="currentDetail.analysis.adPlacement">
              <span class="row-label">广告植入：</span>
              <span class="row-value">{{ currentDetail.analysis.adPlacement }}</span>
            </div>

            <div class="analysis-row" v-if="currentDetail.analysis.analysisContent">
              <span class="row-label">核心内容：</span>
              <span class="row-value">{{ currentDetail.analysis.analysisContent }}</span>
            </div>

            <div class="analysis-row" v-if="currentDetail.analysis.tags && currentDetail.analysis.tags.length > 0">
              <span class="row-label">标签：</span>
              <span class="row-value">{{ currentDetail.analysis.tags.join('、') }}</span>
            </div>
          </div>
        </div>

        <!-- 底部信息栏 -->
        <div class="detail-info">
          <el-tag size="small" type="info">{{ categoryStore.getCategoryName(currentDetail.industry) }}</el-tag>
          <el-tag size="small" :type="getSourceBadgeType(currentDetail.sourceType)">
            {{ getSourceTypeLabel(currentDetail.sourceType) }}
          </el-tag>
          <span class="info-text">字数: {{ currentDetail.content.length }}</span>
          <span class="info-text">{{ formatDate(currentDetail.createdAt) }}</span>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <!-- 查看视频按钮 - 只在有视频链接时显示 -->
          <el-button 
            v-if="currentDetail?.videoUrl" 
            type="danger" 
            size="large"
            @click="openVideo"
          >
            ▶️ 查看原视频
          </el-button>
          <el-button size="large" @click="detailDialogVisible = false">关闭</el-button>
          <el-button size="large" type="primary" @click="rewriteFromDetail">
            仿写此文案
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCopywritingStore } from '@/stores/copywriting'
import { useCategoryStore } from '@/stores/category'
import { useUserStore } from '@/stores/user'
import api from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const copywritingStore = useCopywritingStore()
const categoryStore = useCategoryStore()
const userStore = useUserStore()

// 组件挂载时加载数据
onMounted(async () => {
  // 并行加载分类和文案数据
  await Promise.all([
    categoryStore.loadCategories(),
    copywritingStore.loadCopywritings()
  ])
})

const searchKeyword = ref('')
const filterIndustry = ref('')
const sortBy = ref('created')
const filterType = ref('')

// 详情对话框
const detailDialogVisible = ref(false)
const currentDetail = ref<any>(null)

// 多选批量删除
const selectedItems = ref<string[]>([])

// 从store获取真实数据
const filteredCopywritings = computed(() => {
  let result = [...copywritingStore.copywritings]

  // 按关键词筛选
  if (searchKeyword.value) {
    result = result.filter(
      item =>
        item.title.includes(searchKeyword.value) ||
        item.content.includes(searchKeyword.value)
    )
  }

  // 按行业筛选
  if (filterIndustry.value) {
    result = result.filter(item => item.industry === filterIndustry.value)
  }

  // 按文案类型筛选
  if (filterType.value) {
    switch (filterType.value) {
      case 'mine':
        result = result.filter(item => isCurrentUser(item))
        break
      case 'shared':
        result = result.filter(item => !item.isSystemMaterial && item.isPublic && item.shareStatus === 'approved' && !isCurrentUser(item))
        break
      case 'system':
        result = result.filter(item => item.isSystemMaterial)
        break
    }
  }

  // 按排序方式排序
  switch (sortBy.value) {
    case 'created':
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'updated':
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      break
    case 'rewrite':
      result.sort((a, b) => (b.rewriteCount || 0) - (a.rewriteCount || 0))
      break
    default:
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return result
})

const getSourceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    original: '原创',
    rewrite: '仿写',
    revision: '改写'
  }
  return labels[type] || type
}

const getSortLabel = (sortType: string) => {
  const labels: Record<string, string> = {
    created: '最新创建',
    updated: '最近更新',
    rewrite: '仿写次数'
  }
  return labels[sortType] || sortType
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    mine: '我的文案',
    shared: '共享文案',
    system: '系统素材'
  }
  return labels[type] || type
}

const getVisibilityLabel = (item: any) => {
  if (item.isSystemMaterial) {
    return '系统'
  }
  // 如果是当前用户的文案
  if (isCurrentUser(item)) {
    if (item.isPublic && item.shareStatus === 'approved') {
      return '已共享'
    }
    if (item.shareStatus === 'pending') {
      return '待审核'
    }
    if (item.shareStatus === 'rejected') {
      return '已拒绝'
    }
    return '私有'
  }
  // 如果是其他用户的文案（必定是已审核通过的共享文案）
  return '共享'
}

const getVisibilityTagClass = (item: any) => {
  if (item.isSystemMaterial) {
    return 'system'
  }
  // 如果是当前用户的文案
  if (isCurrentUser(item)) {
    if (item.isPublic && item.shareStatus === 'approved') {
      return 'approved'
    }
    if (item.shareStatus === 'pending') {
      return 'pending'
    }
    if (item.shareStatus === 'rejected') {
      return 'rejected'
    }
    return 'private'
  }
  // 如果是其他用户的文案（必定是已审核通过的共享文案）
  return 'public'
}

const clearFilters = () => {
  searchKeyword.value = ''
  filterIndustry.value = ''
  filterType.value = ''
  sortBy.value = 'created'
}

const isCurrentUser = (item: any) => {
  return item.user && userStore.user && item.user.id === userStore.user.id
}

const refreshData = async () => {
  await copywritingStore.refreshCopywritings()
}

const viewDetail = (id: string) => {
  // 从store中找到对应的文案
  const item = copywritingStore.copywritings.find(c => c.id === id)
  if (item) {
    currentDetail.value = item
    detailDialogVisible.value = true
  }
}

const rewriteFromDetail = () => {
  if (currentDetail.value) {
    detailDialogVisible.value = false
    router.push({ path: '/rewrite', query: { refId: currentDetail.value.id } })
  }
}

const rewriteItem = (id: string) => {
  router.push({ path: '/rewrite', query: { refId: id } })
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getSourceBadgeType = (sourceType: string) => {
  const types: Record<string, any> = {
    original: 'success',
    rewrite: 'primary',
    revision: 'warning'
  }
  return types[sourceType] || 'info'
}

const openVideo = () => {
  if (currentDetail.value?.videoUrl) {
    window.open(currentDetail.value.videoUrl, '_blank')
  }
}

// 判断是否可以删除（只能删除自己的素材，不能删除系统素材和共享素材）
const canDelete = (item: any) => {
  // 系统素材不能删除
  if (item.isSystemMaterial) return false
  // 只能删除自己的文案
  return isCurrentUser(item)
}

// 删除素材
const deleteItem = async (id: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个文案吗？删除后无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.delete(`/copywriting/${id}`)
    ElMessage.success({ message: '删除成功', duration: 1500 })
    
    // 刷新列表
    await copywritingStore.refreshCopywritings()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ 
        message: error.response?.data?.message || '删除失败', 
        duration: 2000 
      })
    }
  }
}

// 多选相关函数
const isSelected = (id: string) => {
  return selectedItems.value.includes(id)
}

const toggleSelect = (id: string) => {
  const index = selectedItems.value.indexOf(id)
  if (index > -1) {
    selectedItems.value.splice(index, 1)
  } else {
    selectedItems.value.push(id)
  }
}

const clearSelection = () => {
  selectedItems.value = []
}

// 批量删除
const batchDelete = async () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning({ message: '请先选择要删除的文案', duration: 2000 })
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 个文案吗？删除后无法恢复。`,
      '确认批量删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 逐个删除
    const deletePromises = selectedItems.value.map(id => 
      api.delete(`/copywriting/${id}`)
    )
    
    await Promise.all(deletePromises)
    
    ElMessage.success({ 
      message: `成功删除 ${selectedItems.value.length} 个文案`, 
      duration: 1500 
    })
    
    // 清空选择并刷新列表
    selectedItems.value = []
    await copywritingStore.refreshCopywritings()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ 
        message: error.response?.data?.message || '批量删除失败', 
        duration: 2000 
      })
    }
  }
}
</script>

<style scoped>
.library-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.filter-group {
  display: flex;
  gap: 1rem;
}

.filter-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(59, 130, 246, 0.2);
}

.selected-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f59e0b;
}

.result-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.active-filters {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.filter-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-right: 0.5rem;
}

.copywriting-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.copywriting-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  position: relative;
  border: 2px solid transparent;
}

.copywriting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.copywriting-card.is-selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.02);
}

.card-checkbox {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  flex: 1;
}

.source-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.2;
}

.source-badge.original {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.source-badge.rewrite {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.source-badge.revision {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.content-preview {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.author-info {
  margin-bottom: 0.75rem;
}

.author-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
  font-style: italic;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tags {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.tag {
  padding: 0.125rem 0.5rem;
  background: var(--bg-gray);
  border-radius: 0.75rem;
  font-size: 0.6875rem;
  color: var(--text-secondary);
  line-height: 1.2;
}

.visibility-tag.private {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.visibility-tag.public {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.visibility-tag.pending {
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
}

.visibility-tag.approved {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.visibility-tag.rejected {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.system-tag {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.loading-state {
  padding: 2rem;
  background: white;
  border-radius: 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  background: white;
  border-radius: 0.75rem;
}

.empty-state .emoji {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  /* 手机端筛选按钮横向排列 */
  .filter-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .filter-group .el-select {
    width: 100% !important;
  }

  .filter-group .el-button {
    grid-column: 1 / -1;
  }

  .filter-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .active-filters {
    flex-wrap: wrap;
  }

  .copywriting-grid {
    grid-template-columns: 1fr;
  }

  /* 批量操作栏手机端优化 */
  .batch-actions {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(59, 130, 246, 0.2);
    width: 100%;
  }
}

/* 详情对话框样式 - 简洁版 */
.detail-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
}

.detail-dialog :deep(.el-dialog__title) {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.detail-content {
  padding: 0;
}

/* 标题区域 */
.title-section {
  margin-bottom: 1.5rem;
}

.content-section {
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.75rem;
}

.title-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  line-height: 1.6;
}

/* 分隔线 */
.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 1.5rem 0;
}

/* 文案内容区 */
.copywriting-content {
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: 1.5rem;
  background: #fafafa;
  border-radius: 0.5rem;
  min-height: 150px;
  max-height: 400px;
  overflow-y: auto;
}

/* 拆解分析区域 - 简洁版 */
.analysis-section {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: #fafafa;
  border-radius: 0.5rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 1rem;
}

.analysis-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analysis-row {
  display: flex;
  line-height: 1.6;
}

.row-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
  min-width: 80px;
  flex-shrink: 0;
}

.row-value {
  font-size: 0.875rem;
  color: #333;
  flex: 1;
  word-wrap: break-word;
}

/* 底部信息栏 */
.detail-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 0.5rem;
  flex-wrap: wrap;
}

.info-text {
  font-size: 0.875rem;
  color: #666;
}

/* 底部操作按钮 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}
</style>





