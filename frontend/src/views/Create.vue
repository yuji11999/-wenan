<template>
  <div class="create-page">
    <h1 class="page-title">✏️ 原创文案创作</h1>

    <!-- 三栏横向布局 -->
    <div class="three-column">
      <!-- 左侧：参考文案（可选） -->
      <div class="card">
        <h3 class="card-title">📖 参考文案（可选）</h3>
        <p class="card-desc">粘贴参考文案，系统会自动分析其结构特点</p>

        <el-input
          v-model="referenceText"
          type="textarea"
          :rows="15"
          placeholder="粘贴参考文案..."
          class="textarea-input"
        />
        <div class="char-count">字数：{{ referenceText.length }}</div>

        <div class="button-group">
          <el-button @click="referenceText = ''">🗑️ 清空</el-button>
          <el-button
            type="primary"
            :loading="analyzingReference"
            @click="analyzeReference"
          >
            🔍 分析
          </el-button>
        </div>
      </div>

      <!-- 中间：文案创作区 -->
      <div class="card">
        <h3 class="card-title">✏️ 文案创作区</h3>
        <p class="card-desc">在这里创作你的原创文案，系统会实时分析</p>

        <el-input
          v-model="createText"
          type="textarea"
          :rows="15"
          placeholder="在这里创作你的原创文案..."
          class="textarea-input"
        />
        <div class="char-count">字数：{{ createText.length }} / 500</div>

        <div class="button-group">
          <el-button @click="createText = ''">🗑️ 清空</el-button>
          <el-button
            type="primary"
            :loading="analyzingCreate"
            @click="analyzeCreate"
          >
            🔍 分析
          </el-button>
          <el-button 
            type="warning"
            :loading="optimizingCreate"
            :disabled="!createText.trim()"
            @click="optimizeCreate"
          >
            ✨ 优化文案
          </el-button>
          <el-button type="success" @click="saveCreate">💾 保存</el-button>
        </div>
      </div>

      <!-- 右侧：素材搜索区 -->
      <div class="card">
        <h3 class="card-title">🔍 素材搜索</h3>
        <p class="card-desc">搜索金句、广告等素材，点击插入</p>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索关键词"
          clearable
          size="small"
          style="margin-bottom: 0.75rem"
        >
          <template #prefix>
            <span>🔍</span>
          </template>
        </el-input>

        <div class="type-buttons">
          <div
            v-for="type in materialTypes"
            :key="type.value"
            class="type-btn"
            :class="{ active: searchType === type.value }"
            @click="searchType = type.value"
          >
            {{ type.label }}
          </div>
        </div>

        <div class="search-results">
          <div v-if="materials.length === 0" class="empty-hint-small">
            暂无素材，请先拆解一些文案
          </div>
          <div v-else-if="filteredMaterials.length === 0" class="empty-hint-small">
            未找到相关素材
          </div>
          <div v-else>
            <div v-if="!searchKeyword && searchType === 'all'" class="result-header">
              🔥 热门素材 (按使用频率排序)
            </div>
            <div class="material-list">
              <div
                v-for="item in filteredMaterials"
                :key="item.id"
                class="material-item"
                @click="insertMaterial(item.content)"
              >
                <div class="material-content">{{ item.content }}</div>
                <div class="material-meta">
                  <el-tag 
                    size="small" 
                    :type="getTagType(item.type)"
                  >
                    {{ item.type }}
                  </el-tag>
                  <span v-if="item.count && item.count > 1" class="use-count">×{{ item.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 下半部分：分析结果对比 -->
    <div class="section">
      <h2 class="section-title">📊 文案分析结果</h2>

      <div class="two-column">
        <!-- 参考文案分析 -->
        <div class="card">
          <h3 class="card-title">📖 参考文案分析</h3>

          <div v-if="!referenceAnalysis" class="empty-hint">
            请在左上方输入参考文案并点击"分析"
          </div>

          <div v-else class="analysis-result">
            <div class="analysis-section">
              <h4>💎 提炼内容</h4>
              <div class="analysis-item">
                <span class="label">📌 话题：</span>
                <span>{{ referenceAnalysis.topic }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">🎣 钩子：</span>
                <span>{{ referenceAnalysis.hook }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">💎 金句：</span>
                <span>{{ referenceAnalysis.goldenSentence }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">📢 广告植入：</span>
                <span>{{ referenceAnalysis.adPlacement }}</span>
              </div>
            </div>

            <div class="analysis-section">
              <h4>🔥 为什么会火</h4>
              <ul class="fire-reasons">
                <li v-for="(reason, index) in referenceAnalysis.fireReasons" :key="index">
                  ✓ {{ reason }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 创作文案分析 -->
        <div class="card">
          <h3 class="card-title">✏️ 创作文案分析</h3>

          <div v-if="!createAnalysis" class="empty-hint">
            请在右上方创作文案并点击"分析"
          </div>

          <div v-else class="analysis-result">
            <div class="analysis-section">
              <h4>💎 提炼内容</h4>
              <div class="analysis-item">
                <span class="label">📌 话题：</span>
                <span>{{ createAnalysis.topic }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">🎣 钩子：</span>
                <span>{{ createAnalysis.hook }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">💎 金句：</span>
                <span>{{ createAnalysis.goldenSentence }}</span>
              </div>
              <div class="analysis-item">
                <span class="label">📢 广告植入：</span>
                <span>{{ createAnalysis.adPlacement }}</span>
              </div>
            </div>

            <div class="analysis-section">
              <h4>🔥 为什么会火</h4>
              <ul class="fire-reasons">
                <li v-for="(reason, index) in createAnalysis.fireReasons" :key="index">
                  {{ reason.startsWith('✓') || reason.startsWith('⚠') ? '' : '✓ ' }}{{ reason }}
                </li>
              </ul>
            </div>

            <div class="analysis-section">
              <h4>💡 改进建议</h4>
              <ul class="suggestions">
                <li v-for="(suggestion, index) in createAnalysis.suggestions" :key="index">
                  💡 {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 优化结果弹窗 -->
    <el-dialog
      v-model="optimizeDialogVisible"
      title="✨ 文案优化结果"
      width="70%"
      :close-on-click-modal="false"
    >
      <div v-if="optimizeResult" class="optimize-dialog">
        <!-- 优化后的文案 -->
        <div class="optimize-section">
          <h4 class="section-title">📝 优化后的文案</h4>
          <div class="optimized-content">
            {{ optimizeResult.optimizedContent }}
          </div>
        </div>

        <!-- 改进点 -->
        <div v-if="optimizeResult.improvements && optimizeResult.improvements.length > 0" class="optimize-section">
          <h4 class="section-title">💡 改进说明</h4>
          <ul class="improvements-list">
            <li v-for="(improvement, index) in optimizeResult.improvements" :key="index">
              {{ improvement }}
            </li>
          </ul>
        </div>

        <!-- 亮点 -->
        <div v-if="optimizeResult.highlights && optimizeResult.highlights.length > 0" class="optimize-section">
          <h4 class="section-title">✨ 优化亮点</h4>
          <ul class="highlights-list">
            <li v-for="(highlight, index) in optimizeResult.highlights" :key="index">
              {{ highlight }}
            </li>
          </ul>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="optimizeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="useOptimizedContent">
            ✅ 使用优化后的文案
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { analyzeCopywriting, createCopywriting, getCopywritings, optimizeCopywriting } from '@/api/copywriting'
import { useAIStore } from '@/stores/ai'
import { useCopywritingStore } from '@/stores/copywriting'

const referenceText = ref('')
const createText = ref('')
const analyzingReference = ref(false)
const analyzingCreate = ref(false)
const optimizingCreate = ref(false)
const searchKeyword = ref('')
const searchType = ref('all') // 默认为全部，不显示素材

// 优化文案相关
const optimizeDialogVisible = ref(false)
const optimizeResult = ref<any>(null)

// 素材类型选项
const materialTypes = [
  { label: '全部', value: 'all' },
  { label: '📌 话题', value: 'topic' },
  { label: '🎣 钩子', value: 'hook' },
  { label: '💎 金句', value: 'golden' },
  { label: '📢 广告', value: 'ad' },
  { label: '📝 核心', value: 'content' },
  { label: '🏷️ 标签', value: 'tags' }
]

interface AnalysisResult {
  topic: string
  hook: string
  goldenSentence: string
  adPlacement: string
  fireReasons: string[]
  suggestions?: string[]
}

const referenceAnalysis = ref<AnalysisResult | null>(null)
const createAnalysis = ref<AnalysisResult | null>(null)
const aiStore = useAIStore()
const copywritingStore = useCopywritingStore()

// 素材数据（从已保存的文案中提取）
interface Material {
  id: string
  content: string
  type: string
  source: string
  count?: number // 使用次数
}

const materials = ref<Material[]>([])
const uniqueMaterials = ref<Material[]>([])

// 加载素材库
const loadMaterials = async () => {
  try {
    const response = await getCopywritings()
    const copywritings = Array.isArray(response) ? response : (response?.data || [])
    
    // 从文案库中提取素材，并统计使用次数
    const contentMap = new Map<string, Material>() // 用于去重和统计
    
    copywritings.forEach((item: any) => {
      if (!item.analysis) return
      
      const source = item.title?.substring(0, 20) || '未命名'
      
      // 辅助函数：添加或更新素材
      const addMaterial = (content: string, type: string) => {
        if (!content || content.trim().length === 0) return
        
        const key = `${type}:${content.trim()}`
        if (contentMap.has(key)) {
          // 已存在，增加计数
          const existing = contentMap.get(key)!
          existing.count = (existing.count || 1) + 1
        } else {
          // 新素材
          contentMap.set(key, {
            id: key,
            content: content.trim(),
            type: type,
            source: source,
            count: 1
          })
        }
      }
      
      // 提取各类素材
      if (item.analysis.topic) addMaterial(item.analysis.topic, '话题')
      if (item.analysis.hook) addMaterial(item.analysis.hook, '钩子')
      if (item.analysis.goldenSentence) addMaterial(item.analysis.goldenSentence, '金句')
      if (item.analysis.adPlacement) addMaterial(item.analysis.adPlacement, '广告')
      
      // 提取核心内容
      const content = item.analysis.content || item.analysis.analysisContent
      if (content && content.length > 10) {
        addMaterial(content, '核心内容')
      }
      
      // 提取标签
      if (item.analysis.tags && Array.isArray(item.analysis.tags)) {
        item.analysis.tags.forEach((tag: string) => {
          if (tag) addMaterial(tag, '标签')
        })
      }
    })
    
    // 转换为数组并按使用次数排序
    const extracted = Array.from(contentMap.values())
      .sort((a, b) => (b.count || 0) - (a.count || 0))
    
    materials.value = extracted
    uniqueMaterials.value = extracted
  } catch (error) {
  }
}

// 过滤素材
const filteredMaterials = computed(() => {
  let filtered = materials.value
  
  // 按类型过滤
  if (searchType.value !== 'all') {
    const typeMap: Record<string, string> = {
      'topic': '话题',
      'hook': '钩子',
      'golden': '金句',
      'ad': '广告',
      'content': '核心内容',
      'tags': '标签'
    }
    const targetType = typeMap[searchType.value]
    if (targetType) {
      filtered = filtered.filter(m => m.type === targetType)
    }
    // 有类型选择时，显示该类型的热门素材（前20个）
    if (!searchKeyword.value) {
      return filtered.slice(0, 20)
    }
  } else if (!searchKeyword.value) {
    // 如果没有选择类型也没有输入关键词，显示最热门的10个素材
    return filtered.slice(0, 10)
  }
  
  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.content.toLowerCase().includes(keyword) ||
      m.source.toLowerCase().includes(keyword)
    )
  }
  
  return filtered.slice(0, 30) // 最多显示30条
})

// 插入素材到创作区
const insertMaterial = (content: string) => {
  if (createText.value) {
    createText.value += '\n' + content
  } else {
    createText.value = content
  }
  ElMessage.success({ message: '素材已插入到创作区', duration: 1500 })
}

// 获取标签颜色类型
const getTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    '话题': 'primary',
    '钩子': 'info',
    '金句': 'warning',
    '广告': 'danger',
    '核心内容': 'success',
    '标签': 'info'
  }
  return typeMap[type] || 'info'
}

// 初始化时加载素材
loadMaterials()

const analyzeReference = async () => {
  if (!referenceText.value.trim()) {
    ElMessage.warning('请输入参考文案')
    return
  }

  analyzingReference.value = true

  try {
    // 调用后端API分析参考文案（后端会自动从数据库获取激活的AI配置）
    const result = await analyzeCopywriting(referenceText.value)

    if (result) {
      referenceAnalysis.value = {
        topic: result.topic || '',
        hook: result.hook || '',
        goldenSentence: result.goldenSentence || '',
        adPlacement: result.adPlacement || '',
        fireReasons: result.fireReasons || []
      }
      ElMessage.success({ message: '参考文案分析完成', duration: 1500 })
    } else {
      throw new Error('返回数据格式错误')
    }
  } catch (error: any) {

    let errorMessage = '参考文案分析失败'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    // 只有真正未配置时才提示"AI服务未配置"，密钥无效等问题直接显示原始错误
    if (errorMessage.includes('未找到有效的AI配置')) {
      ElMessage.error({
        message: '⚠️ AI服务未配置\n\n请在"系统设置"中配置并激活一个AI服务',
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
    analyzingReference.value = false
  }
}

const analyzeCreate = async () => {
  if (!createText.value.trim()) {
    ElMessage.warning('请输入创作文案')
    return
  }

  analyzingCreate.value = true

  try {
    // 调用后端API分析创作文案（后端会自动从数据库获取激活的AI配置）
    const result = await analyzeCopywriting(createText.value)

    if (result) {
      createAnalysis.value = {
        topic: result.topic || '',
        hook: result.hook || '',
        goldenSentence: result.goldenSentence || '',
        adPlacement: result.adPlacement || '',
        fireReasons: result.fireReasons || [],
        suggestions: result.suggestions || []
      }
      ElMessage.success({ message: '创作文案分析完成', duration: 1500 })
    } else {
      throw new Error('返回数据格式错误')
    }
  } catch (error: any) {

    let errorMessage = '创作文案分析失败'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    // 只有真正未配置时才提示"AI服务未配置"，密钥无效等问题直接显示原始错误
    if (errorMessage.includes('未找到有效的AI配置')) {
      ElMessage.error({
        message: '⚠️ AI服务未配置\n\n请在"系统设置"中配置并激活一个AI服务',
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
    analyzingCreate.value = false
  }
}

const saveCreate = async () => {
  if (!createText.value.trim()) {
    ElMessage.warning('请输入创作文案')
    return
  }

  try {
    // 调用后端API保存文案（后端会自动从数据库获取激活的AI配置）
    await createCopywriting({
      reference: referenceText.value || undefined,
      content: createText.value
    })

    // 标记文案数据需要刷新，确保切换页面时能看到新数据
    copywritingStore.markAsStale()

    ElMessage.success({ message: '文案已保存到文案库', duration: 1500 })

    // 清空表单
    referenceText.value = ''
    createText.value = ''
    referenceAnalysis.value = null
    createAnalysis.value = null
    
    // 重新加载素材库
    await loadMaterials()
  } catch (error: any) {

    let errorMessage = '保存文案失败'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    ElMessage.error({
      message: errorMessage,
      duration: 5000,
      showClose: true
    })
  }
}

// 优化文案
const optimizeCreate = async () => {
  if (!createText.value.trim()) {
    ElMessage.warning('请输入需要优化的文案')
    return
  }

  optimizingCreate.value = true

  try {
    // 调用后端API优化文案
    const result = await optimizeCopywriting(createText.value)

    if (result) {
      optimizeResult.value = {
        optimizedContent: result.optimizedContent || '',
        improvements: result.improvements || [],
        highlights: result.highlights || []
      }
      optimizeDialogVisible.value = true
      ElMessage.success({ message: '文案优化完成', duration: 1500 })
    } else {
      throw new Error('返回数据格式错误')
    }
  } catch (error: any) {

    let errorMessage = '文案优化失败'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    if (errorMessage.includes('未找到有效的AI配置')) {
      ElMessage.error({
        message: '⚠️ AI服务未配置\n\n请在"系统设置"中配置并激活一个AI服务',
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
    optimizingCreate.value = false
  }
}

// 使用优化后的文案
const useOptimizedContent = () => {
  if (optimizeResult.value && optimizeResult.value.optimizedContent) {
    createText.value = optimizeResult.value.optimizedContent
    optimizeDialogVisible.value = false
    ElMessage.success({ message: '已应用优化后的文案', duration: 1500 })
  }
}
</script>

<style scoped>
.create-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.three-column {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid #dcdfe6;
  border-radius: 0.25rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.type-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.type-btn.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.result-header {
  font-size: 0.8125rem;
  color: #666;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #fff9e6;
  border-radius: 0.25rem;
  text-align: center;
  font-weight: 500;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.empty-hint-small {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.material-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.material-item {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e9ecef;
}

.material-item:hover {
  background: #e7f3ff;
  border-color: #409eff;
  transform: translateX(2px);
}

.material-content {
  font-size: 0.875rem;
  color: #333;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.material-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.material-source {
  color: var(--text-secondary);
}

.use-count {
  font-size: 0.75rem;
  color: #f56c6c;
  font-weight: 600;
  margin-left: 0.5rem;
}

.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.textarea-input {
  margin-bottom: 0.5rem;
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.empty-hint {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.analysis-result {
  width: 100%;
}

.analysis-section {
  margin-bottom: 1.5rem;
}

.analysis-section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.analysis-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.analysis-item .label {
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 80px;
}

.fire-reasons,
.suggestions {
  list-style: none;
  padding: 0;
}

.fire-reasons li,
.suggestions li {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--bg-gray);
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

@media (max-width: 1200px) {
  .three-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .two-column {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card {
    padding: 1rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .input-group {
    margin-bottom: 1rem;
  }

  .input-label {
    font-size: 0.8125rem;
  }

  .button-group {
    flex-direction: column;
  }

  .button-group button {
    width: 100%;
  }
}

/* 优化弹窗样式 */
.optimize-dialog {
  padding: 1rem 0;
}

.optimize-section {
  margin-bottom: 1.5rem;
}

.optimize-section:last-child {
  margin-bottom: 0;
}

.optimize-section .section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.optimized-content {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  line-height: 1.8;
  font-size: 0.9375rem;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.improvements-list,
.highlights-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.improvements-list li,
.highlights-list li {
  padding: 0.625rem 1rem;
  margin-bottom: 0.5rem;
  background: #fff9e6;
  border-left: 3px solid #f59e0b;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.highlights-list li {
  background: #e7f3ff;
  border-left-color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>





