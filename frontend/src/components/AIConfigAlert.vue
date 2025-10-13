<template>
  <el-alert
    v-if="!isConfigured"
    title="⚠️ AI服务未配置"
    type="warning"
    :closable="false"
    show-icon
    class="ai-config-alert"
  >
    <template #default>
      <div class="alert-content">
        <p>当前AI服务未配置，无法使用以下功能：</p>
        <ul>
          <li>📊 文案拆解</li>
          <li>🔥 爆款分析</li>
          <li>🔄 文案仿写</li>
          <li>✍️ 原创创作</li>
        </ul>
        <p class="config-guide">
          <strong>配置方式：</strong>
        </p>
        <ol>
          <li>点击右上角进入"系统设置"</li>
          <li>选择AI服务商（OpenAI、通义千问、文心一言等）</li>
          <li>输入API密钥并保存</li>
        </ol>
        <el-button type="primary" size="small" @click="goToSettings">
          前往配置
        </el-button>
      </div>
    </template>
  </el-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAIStore } from '@/stores/ai'

const router = useRouter()
const aiStore = useAIStore()

// 检查是否已配置AI服务
const isConfigured = computed(() => {
  return aiStore.currentConfig !== null
})

const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped>
.ai-config-alert {
  margin-bottom: 1.5rem;
}

.alert-content {
  line-height: 1.8;
}

.alert-content ul,
.alert-content ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.alert-content li {
  margin: 0.25rem 0;
}

.config-guide {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.alert-content .el-button {
  margin-top: 1rem;
}
</style>

