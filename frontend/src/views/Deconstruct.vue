<template>
  <div class="deconstruct-page">
    <h1 class="page-title">📊 文案拆解</h1>

    <div class="split-view">
      <!-- 左侧：原文展示 -->
      <div class="card">
        <h3 class="card-title">📝 原文案</h3>
        
        <!-- 视频链接输入（可选） -->
        <div class="input-group">
          <label class="input-label">🎬 视频链接（可选）</label>
          <el-input
            v-model="videoUrl"
            placeholder="粘贴原视频的链接地址（抖音、快手、视频号等）"
            clearable
            @paste="handlePaste"
          />
          <div class="input-hint">支持粘贴包含链接的文本，会自动提取视频链接</div>
        </div>

        <!-- 行业选择 -->
        <div class="input-group">
          <label class="input-label">🏢 行业分类</label>
          <el-select 
            v-model="selectedIndustry" 
            placeholder="请选择文案所属行业"
            clearable
          >
            <el-option
              v-for="cat in categoryStore.categoryOptions"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
          <div class="input-hint">请先选择行业分类，便于精准分析</div>
        </div>

        <!-- 文案内容输入 -->
        <div class="input-group">
          <label class="input-label">📄 文案内容</label>
          <el-input
            v-model="originalText"
            type="textarea"
            :autosize="{ minRows: 12, maxRows: 30 }"
            placeholder="请输入需要拆解的文案内容..."
          />
          <div class="char-count">字数：{{ originalText.length }}</div>
        </div>

        <div class="button-group">
          <el-button @click="clearAll">🗑️ 清空</el-button>
          <el-button type="primary" :loading="analyzing" @click="analyzeText">
            🤖 AI自动拆解
          </el-button>
        </div>
      </div>

      <!-- 右侧：拆解结果 -->
      <div class="card">
        <h3 class="card-title">🔍 拆解结果（可编辑）</h3>

        <div v-if="!analysis" class="empty-hint">
          请输入文案内容，点击"AI自动拆解"开始分析
        </div>

        <div v-else class="analysis-form">
          <div class="input-group">
            <label class="input-label">📌 话题</label>
            <el-input 
              v-model="analysis.topic" 
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 5 }"
              placeholder="文案的核心主题" 
            />
          </div>

          <div class="input-group">
            <label class="input-label">🎣 钩子</label>
            <el-input 
              v-model="analysis.hook" 
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 5 }"
              placeholder="吸引用户注意力的开场/要素" 
            />
          </div>

          <div class="input-group">
            <label class="input-label">💎 金句</label>
            <el-input 
              v-model="analysis.goldenSentence" 
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 5 }"
              placeholder="文案中的亮点语句" 
            />
          </div>

          <div class="input-group">
            <label class="input-label">📢 广告植入</label>
            <el-input 
              v-model="analysis.adPlacement" 
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 5 }"
              placeholder="商业内容的植入方式" 
            />
          </div>

          <div class="input-group">
            <label class="input-label">📝 核心内容</label>
            <el-input
              v-model="analysis.content"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 20 }"
              placeholder="主体内容描述"
            />
          </div>

          <div class="input-group">
            <label class="input-label">🏷️ 标签</label>
            <el-input 
              v-model="tagsStr" 
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="关键词标签，用逗号分隔" 
            />
          </div>

          <el-button type="primary" size="large" class="save-btn" @click="saveAnalysis">
            💾 保存拆解结果
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useCopywritingStore } from '@/stores/copywriting'
import { deconstructCopywriting, saveDeconstructionResult } from '@/api/copywriting'
import { useAIStore } from '@/stores/ai'
import { useCategoryStore } from '@/stores/category'

const copywritingStore = useCopywritingStore()
const categoryStore = useCategoryStore()

// 初始化时加载分类列表
onMounted(async () => {
  await categoryStore.loadCategories()
  // 如果有分类，默认选择第一个
  if (categoryStore.categoryOptions.length > 0) {
    selectedIndustry.value = categoryStore.categoryOptions[0].value
  }
})

const videoUrl = ref('')
const originalText = ref('')
const analyzing = ref(false)
const selectedIndustry = ref('')

// 处理粘贴事件，自动提取视频链接
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text') || ''
  
  // 使用正则表达式提取URL
  const urlPattern = /https?:\/\/[^\s]+/g
  const urls = pastedText.match(urlPattern)
  
  if (urls && urls.length > 0) {
    // 优先提取视频平台的链接
    const extractedUrl = urls.find(url => 
      url.includes('douyin.com') || 
      url.includes('kuaishou.com') || 
      url.includes('ixigua.com') ||
      url.includes('weixin.qq.com') ||
      url.includes('bilibili.com') ||
      url.includes('xiaohongshu.com')
    ) || urls[0] // 如果没有找到视频平台链接，取第一个URL
    
    // 清理URL末尾可能的多余字符
    const cleanUrl = extractedUrl.replace(/[\/\s]*$/, '')
    videoUrl.value = cleanUrl
    
    ElMessage.success({ message: '已自动提取视频链接', duration: 1500 })
  } else {
    // 如果没有找到URL，直接使用粘贴的文本
    videoUrl.value = pastedText
  }
}

interface AnalysisData {
  topic: string
  hook: string
  goldenSentence: string
  adPlacement: string
  content: string
  tags: string[]
  industry: string
}

const analysis = ref<AnalysisData | null>(null)

const tagsStr = computed({
  get: () => analysis.value?.tags.join(', ') || '',
  set: (val: string) => {
    if (analysis.value) {
      analysis.value.tags = val.split(',').map(t => t.trim()).filter(t => t)
    }
  }
})

const aiStore = useAIStore()

const analyzeText = async () => {
  if (!originalText.value.trim()) {
    ElMessage.warning({ message: '请输入文案内容', duration: 2000 })
    return
  }

  if (!selectedIndustry.value) {
    ElMessage.warning({ message: '请先选择行业分类', duration: 2000 })
    return
  }

  analyzing.value = true

  try {
    // 调用后端API进行文案拆解，携带用户选择的行业
    const result = await deconstructCopywriting({
      content: originalText.value,
      videoUrl: videoUrl.value || undefined,
      industry: selectedIndustry.value
    })

    // 提取分析结果，使用用户选择的行业而不是AI生成的
    if (result && result.analysis) {
      analysis.value = {
        topic: result.analysis.topic || '',
        hook: result.analysis.hook || '',
        goldenSentence: result.analysis.goldenSentence || '',
        adPlacement: result.analysis.adPlacement || '',
        content: result.analysis.content || result.analysis.analysisContent || '',
        tags: Array.isArray(result.analysis.tags) ? result.analysis.tags : [],
        industry: selectedIndustry.value // 使用用户选择的行业
      }

      ElMessage.success({ message: 'AI拆解完成，请检查并修正结果', duration: 1500 })
    } else {
      throw new Error('返回数据格式错误')
    }
  } catch (error: any) {

    // 提取错误信息
    let errorMessage = '文案拆解失败'

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }

    // 特殊处理AI配置相关错误
    // 只有真正未配置时才提示"AI服务未配置"，密钥无效等问题直接显示原始错误
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
    analyzing.value = false
  }
}

const clearAll = () => {
  videoUrl.value = ''
  originalText.value = ''
  selectedIndustry.value = ''
  analysis.value = null
}

const saveAnalysis = async () => {
  if (!analysis.value) {
    ElMessage.warning({ message: '请先进行AI拆解', duration: 2000 })
    return
  }

  try {
    // 调用后端API保存拆解结果到数据库
    await saveDeconstructionResult({
      content: originalText.value,
      videoUrl: videoUrl.value || '',
      industry: selectedIndustry.value,
      analysis: analysis.value
    })

    // 标记文案数据需要刷新，确保切换页面时能看到新数据
    copywritingStore.markAsStale()

    ElMessage.success({ message: '拆解结果已保存到数据库', duration: 1500 })
    clearAll()
  } catch (error: any) {
    ElMessage.error({ message: error.response?.data?.message || '保存失败，请重试', duration: 2000 })
  }
}
</script>

<style scoped>
.deconstruct-page {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: var(--text-primary);
}

.split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
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
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.input-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
  line-height: 1.4;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.empty-hint {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.analysis-form {
  width: 100%;
}

.save-btn {
  width: 100%;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .page-title {
    display: none;
  }

  .split-view {
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

  .char-count {
    font-size: 0.6875rem;
  }
}
</style>




