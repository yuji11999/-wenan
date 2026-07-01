<template>
  <div class="dashboard">
    <h1 class="page-title">工作台</h1>

    <!-- 快速入口 -->
    <div class="dashboard-grid">
      <div
        v-for="item in quickActions"
        :key="item.path"
        class="dashboard-card"
        :style="{ background: item.gradient }"
        @click="navigateTo(item.path)"
      >
        <h3>{{ item.icon }} {{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="section">
      <h2 class="section-title">数据概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalCopywritings }}</div>
          <div class="stat-label">文案总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalTopics }}</div>
          <div class="stat-label">话题总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalGoldenSentences }}</div>
          <div class="stat-label">金句总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalHooks }}</div>
          <div class="stat-label">钩子总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalCreations }}</div>
          <div class="stat-label">创作总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.weeklyCreations }}</div>
          <div class="stat-label">本周创作</div>
        </div>
      </div>
    </div>

    <!-- 热门文案 -->
    <div class="section">
      <h2 class="section-title">热门文案</h2>
      <div v-if="hotCopywritings.length === 0" class="empty-state">
        <div class="emoji">📝</div>
        <p>暂无文案，开始创作吧！</p>
      </div>
      <div v-else class="copywriting-list">
        <div
          v-for="item in hotCopywritings"
          :key="item.id"
          class="list-item"
          @click="viewCopywriting(item.id)"
        >
          <div class="list-item-header">
            <h4>{{ item.title || '无标题' }}</h4>
            <span class="hot-badge">🔥 热门</span>
          </div>
          <p class="text-secondary">{{ item.content.substring(0, 100) }}...</p>
          <div class="meta">
            <span class="tag">{{ categoryStore.getCategoryName(item.industry) }}</span>
            <span class="time">{{ formatDate(item.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCopywritingStore } from '@/stores/copywriting'
import { useCategoryStore } from '@/stores/category'
import dayjs from 'dayjs'

const router = useRouter()
const copywritingStore = useCopywritingStore()
const categoryStore = useCategoryStore()

const quickActions = [
  {
    title: '文案拆解',
    icon: '📊',
    description: '对已有文案进行AI自动拆解和分析',
    path: '/deconstruct',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    title: '原创创作',
    icon: '✏️',
    description: '从零创作原创文案，AI辅助分析',
    path: '/create',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    title: '文案仿写',
    icon: '🔄',
    description: '基于参考文案生成仿写内容',
    path: '/rewrite',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    title: '素材库',
    icon: '📚',
    description: '管理和搜索文案素材',
    path: '/library',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  }
]

// 统计数据
const stats = computed(() => {
  const copywritings = copywritingStore.copywritings
  const analyses = copywritingStore.analyses
  
  // 获取本周开始时间
  const weekStart = dayjs().startOf('week')
  
  // 统计不重复的话题、金句、钩子
  const topics = new Set<string>()
  const goldenSentences = new Set<string>()
  const hooks = new Set<string>()
  
  analyses.forEach(analysis => {
    if (analysis.topic) topics.add(analysis.topic)
    if (analysis.goldenSentence) goldenSentences.add(analysis.goldenSentence)
    if (analysis.hook) hooks.add(analysis.hook)
  })
  
  // 统计本周创作
  const weeklyCreations = copywritings.filter(item => 
    dayjs(item.createdAt).isAfter(weekStart)
  ).length
  
  return {
    totalCopywritings: copywritings.length,
    totalTopics: topics.size,
    totalGoldenSentences: goldenSentences.size,
    totalHooks: hooks.size,
    totalCreations: copywritings.filter(c => c.sourceType === 'original').length,
    weeklyCreations
  }
})

// 热门文案（最近创建的前5个）
const hotCopywritings = computed(() => {
  return [...copywritingStore.copywritings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
})

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const navigateTo = (path: string) => {
  router.push(path)
}

const viewCopywriting = (_id: string) => {
  router.push(`/library`)
}

// 页面加载时获取数据（使用缓存）
onMounted(async () => {
  await Promise.all([
    categoryStore.loadCategories(),
    copywritingStore.loadCopywritings()
  ])
})
</script>

<style scoped>
.dashboard {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.dashboard-card {
  color: white;
  padding: 2rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.dashboard-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.dashboard-card p {
  opacity: 0.9;
  font-size: 0.875rem;
}

.section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.copywriting-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-item {
  padding: 1.5rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  border-color: var(--primary-color);
  transform: translateX(4px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.list-item h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-badge {
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

.text-secondary {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
  border-radius: 1rem;
  font-size: 0.75rem;
}

.time {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  text-align: center;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
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

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .dashboard-card {
    padding: 1.5rem;
  }

  .dashboard-card h3 {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-value {
    font-size: 2rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.125rem;
  }

  .list-item {
    padding: 1rem;
  }

  .list-item h4 {
    font-size: 1rem;
  }
}
</style>



