<template>
  <div class="rewrite-page">
    <h1 class="page-title">🔄 文案仿写</h1>

    <!-- 直接输入模式 -->
    <div class="direct-mode">
      <div class="input-section">
        <div class="card input-card">
          <div class="card-header">
            <h3 class="card-title">📝 参考文案输入</h3>
            <el-button size="small" @click="showSearchDialog">
              🔍 从文案库搜索
            </el-button>
          </div>
          <el-input
            v-model="directInput"
            type="textarea"
            placeholder="粘贴或输入要作为参考的文案..."
            class="input-textarea"
          />
          <div class="char-count">字数：{{ directInput.length }}</div>
        </div>
        
        <!-- 仿写设置（右侧） -->
        <div class="card settings-card">
          <h3 class="card-title">⚙️ 仿写设置</h3>

          <div class="input-group">
            <label class="input-label">新的核心内容/卖点</label>
            <el-input
              v-model="newContent"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 15 }"
              placeholder="输入你想要表达的新内容或卖点..."
            />
          </div>

          <div class="input-group">
            <label class="input-label">仿写类型</label>
            <el-select v-model="rewriteType" placeholder="选择仿写类型">
              <el-option label="结构仿写 - 保持原文案结构，替换内容" value="structure" />
              <el-option label="风格仿写 - 保持原文案风格和语气" value="style" />
              <el-option label="钩子仿写 - 保留钩子方式，更换内容" value="hook" />
              <el-option label="混合仿写 - 自定义保留和替换的部分" value="mixed" />
            </el-select>
          </div>

          <el-button
            type="primary"
            size="large"
            :loading="generating"
            class="generate-btn"
            @click="generateRewrite"
          >
            🚀 生成仿写文案
          </el-button>
        </div>
      </div>
      
      <!-- 下方：生成结果显示区域 -->
      <div class="result-section">
        <div class="input-section">
          <!-- 左侧：参考文案预览 -->
          <div class="card reference-card">
            <h3 class="card-title">📖 参考文案</h3>
            <div v-if="!selectedReference" class="empty-hint">
              请输入参考文案
            </div>
            <div v-else class="reference-content">
              {{ selectedReference }}
            </div>
          </div>
          
          <!-- 右侧：生成结果 -->
          <div class="card result-card">
            <h3 class="card-title">✨ 生成结果</h3>
            
            <el-input
              v-model="rewriteResult"
              type="textarea"
              placeholder="仿写结果将在这里显示..."
              class="result-textarea"
            />

            <div v-if="rewriteResult" class="action-buttons">
              <el-button @click="generateRewrite">🔄 重新生成</el-button>
              <el-button type="success" @click="saveRewrite">
                💾 保存（自动关联原文案）
              </el-button>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- 文案库搜索弹窗 -->
    <el-dialog
      v-model="searchDialogVisible"
      title="🔍 从文案库搜索"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="search-dialog-content">
        <el-input
          v-model="searchKeyword"
          placeholder="输入关键词搜索文案..."
          size="large"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <span>🔍</span>
          </template>
        </el-input>

        <div v-if="searching" class="search-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>搜索中...</span>
        </div>

        <div v-else-if="searchResults.length > 0" class="search-results">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="result-item"
            @click="selectSearchResult(item)"
          >
            <div class="result-header">
              <h4>{{ item.title || '无标题' }}</h4>
              <el-tag v-if="item.industry" size="small">{{ item.industry }}</el-tag>
            </div>
            <p class="result-content">{{ item.content.substring(0, 200) }}{{ item.content.length > 200 ? '...' : '' }}</p>
            <div class="result-meta">
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="searchKeyword" class="search-empty">
          <el-empty description="未找到相关文案" :image-size="80" />
        </div>

        <div v-else class="search-hint">
          <el-empty description="输入关键词开始搜索" :image-size="80" />
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { rewriteCopywriting, saveRewriteResult, getCopywritings } from '@/api/copywriting'
import { useCopywritingStore } from '@/stores/copywriting'
import dayjs from 'dayjs'

const copywritingStore = useCopywritingStore()

const directInput = ref('')
const newContent = ref('')
const rewriteType = ref('structure')
const generating = ref(false)
const rewriteResult = ref('')
const rewriteData = ref<any>(null) // 保存完整的生成结果，用于保存时使用

// 搜索相关
const searchDialogVisible = ref(false)
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<any[]>([])
const allCopywritings = ref<any[]>([])

const selectedReference = computed(() => {
  return directInput.value
})

// 显示搜索弹窗
const showSearchDialog = async () => {
  searchDialogVisible.value = true
  searchKeyword.value = ''
  searchResults.value = []
  
  // 加载所有文案（如果还没加载）
  if (allCopywritings.value.length === 0) {
    await loadAllCopywritings()
  }
}

// 加载所有文案
const loadAllCopywritings = async () => {
  searching.value = true
  try {
    const result = await getCopywritings()
    if (result && Array.isArray(result)) {
      allCopywritings.value = result
    }
  } catch (error) {
    ElMessage.error({ message: '加载文案库失败', duration: 2000 })
  } finally {
    searching.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  const keyword = searchKeyword.value.toLowerCase()
  searchResults.value = allCopywritings.value.filter(item =>
    item.title?.toLowerCase().includes(keyword) ||
    item.content?.toLowerCase().includes(keyword) ||
    item.topic?.toLowerCase().includes(keyword) ||
    item.industry?.toLowerCase().includes(keyword)
  )
}

// 选择搜索结果
const selectSearchResult = (item: any) => {
  directInput.value = item.content
  searchDialogVisible.value = false
  ElMessage.success({ message: '已选择参考文案', duration: 1500 })
}

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const generateRewrite = async () => {
  if (!selectedReference.value) {
    ElMessage.warning({ message: '请先输入参考文案', duration: 2000 })
    return
  }

  if (!newContent.value.trim()) {
    ElMessage.warning({ message: '请输入新的核心内容/卖点', duration: 2000 })
    return
  }

  generating.value = true

  try {
    // 调用后端API生成仿写文案（只生成，不保存）
    const result = await rewriteCopywriting({
      referenceContent: selectedReference.value,
      newContent: newContent.value,
      rewriteType: rewriteType.value as 'structure' | 'style' | 'hook' | 'mixed'
    })

    if (result && result.content) {
      rewriteResult.value = result.content
      // 保存完整结果，供保存时使用
      rewriteData.value = {
        title: result.title || '',
        content: result.content,
        highlights: result.highlights || [],
        referenceContent: selectedReference.value,
        rewriteType: rewriteType.value
      }
      
      ElMessage.success({ message: '仿写文案生成成功！', duration: 1500 })
    } else {
      throw new Error('返回数据格式错误')
    }
  } catch (error: any) {

    // 提取错误信息
    let errorMessage = '仿写生成失败'

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    // 特殊处理AI配置相关错误 - 只有真正未配置时才提示"AI服务未配置"
    if (errorMessage.includes('未找到有效的AI配置')) {
      ElMessage.error({
        message: '⚠️ AI服务未配置\n\n请在"系统设置"中配置并激活一个AI服务',
        duration: 5000,
        showClose: true
      })
    } else if (errorMessage.includes('无法连接') || errorMessage.includes('网络')) {
      ElMessage.error({
        message: `网络连接失败：${errorMessage}\n\n请检查网络连接和API地址配置`,
        duration: 5000,
        showClose: true
      })
    } else {
      ElMessage.error({
        message: errorMessage,
        duration: 5000,
        showClose: true
      })
    }
  } finally {
    generating.value = false
  }
}

const saveRewrite = async () => {
  if (!rewriteResult.value || !rewriteData.value) {
    ElMessage.warning({ message: '请先生成仿写文案', duration: 2000 })
    return
  }

  try {
    // 调用保存API
    await saveRewriteResult(rewriteData.value)
    
    // 标记文案数据需要刷新
    copywritingStore.markAsStale()
    
    ElMessage.success({ message: '仿写文案已保存到文案库', duration: 1500 })

    // 清空表单
    newContent.value = ''
    rewriteResult.value = ''
    rewriteData.value = null
  } catch (error: any) {
    ElMessage.error({ 
      message: error.response?.data?.message || '保存失败', 
      duration: 2000 
    })
  }
}
</script>

<style scoped>
.rewrite-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.direct-mode {
  margin-bottom: 2rem;
}

.input-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.input-card {
  /* 左侧输入框 */
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.input-textarea {
  flex: 1;
}

.input-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 220px;
  resize: none;
}

.result-card {
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.result-textarea {
  flex: 1;
}

.result-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 200px;
  resize: none;
}

.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.result-section {
  margin-top: 2rem;
}

.reference-card,
.settings-card {
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.empty-hint {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.reference-content {
  padding: 1rem;
  background: var(--bg-gray);
  border-radius: 0.5rem;
  line-height: 1.8;
  flex: 1;
  overflow-y: auto;
}

.input-group {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.generate-btn {
  width: 100%;
  margin-top: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.trace-info {
  margin-top: 1rem;
}

/* 搜索弹窗样式 */
.search-dialog-content {
  padding: 0;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--text-secondary);
}

.search-results {
  margin-top: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.result-item {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.result-item:hover {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.result-header h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.result-content {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0.5rem 0;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.search-empty,
.search-hint {
  padding: 2rem;
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .direct-mode {
    margin-bottom: 1rem;
  }

  .input-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card {
    padding: 1rem;
  }

  .card-title {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .input-card,
  .settings-card,
  .reference-card,
  .result-card {
    min-height: auto;
  }

  .input-textarea :deep(.el-textarea__inner),
  .result-textarea :deep(.el-textarea__inner) {
    min-height: 150px;
  }

  .reference-content {
    max-height: 200px;
  }

  .input-label {
    font-size: 0.8125rem;
  }

  .generate-btn {
    font-size: 0.875rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons button {
    width: 100%;
  }

  .result-section {
    margin-top: 1rem;
  }

  /* 搜索对话框 */
  .search-results {
    max-height: 300px;
  }

  .result-item {
    padding: 0.75rem;
  }
}
</style>
