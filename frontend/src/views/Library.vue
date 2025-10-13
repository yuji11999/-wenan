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
      >
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCopywritingStore } from '@/stores/copywriting'
import { useCategoryStore } from '@/stores/category'
import { useUserStore } from '@/stores/user'

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
  // TODO: 跳转到详情页
}

const rewriteItem = (id: string) => {
  router.push({ path: '/rewrite', query: { refId: id } })
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
}

.copywriting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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
  }

  .filter-group {
    flex-direction: column;
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
}
</style>





