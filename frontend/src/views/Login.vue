<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>短视频文案系统</h1>
        <p>{{ isLogin ? '欢迎登录' : '欢迎注册' }}</p>
      </div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            native-type="button"
            @click="handleSubmit"
          >
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>

        <div class="form-footer">
          <el-link type="primary" @click="toggleMode">
            {{ isLogin ? '还没有账号？立即注册' : '已有账号？立即登录' }}
          </el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'
import { useCopywritingStore } from '@/stores/copywriting'
import { useCategoryStore } from '@/stores/category'
import { useAIStore } from '@/stores/ai'

const router = useRouter()
const formRef = ref<FormInstance>()
const isLogin = ref(true)
const loading = ref(false)

// 获取 stores 实例
const userStore = useUserStore()
const copywritingStore = useCopywritingStore()
const categoryStore = useCategoryStore()
const aiStore = useAIStore()

const formData = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ]
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (isLogin.value) {
        // 登录前先清理旧数据，避免用户切换时出现数据混乱
        copywritingStore.resetStore()
        categoryStore.resetStore()
        aiStore.resetStore()
        
        // 登录
        const payload = {
          username: formData.username.trim(),
          password: formData.password
        }
        const response = await api.post('/auth/login', payload)

        // 使用 store 方法保存登录信息
        userStore.login(response.user, response.access_token)

        ElMessage.success({ message: '登录成功', duration: 1500 })
        router.push('/dashboard')
      } else {
        // 注册
        const payload = {
          username: formData.username.trim(),
          password: formData.password
        }
        const response = await api.post('/auth/register', payload)

        ElMessage.success({ message: response.message || '注册成功，请等待管理员审核', duration: 2000 })

        // 注册成功后切换到登录模式
        isLogin.value = true
        formRef.value?.resetFields()
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || '操作失败'
      
      // 检查是否是账号锁定错误
      if (message.includes('账号已被锁定') || message.includes('剩余尝试次数')) {
        ElMessage.error({
          message,
          duration: 5000,
          showClose: true
        })
      } else {
        ElMessage.error(message)
      }
      
      // 如果是登录失败且有剩余次数提示，显示警告
      if (isLogin.value && message.includes('剩余尝试次数')) {
        ElMessage.warning({
          message: '多次登录失败将导致账号被锁定，请仔细检查用户名和密码',
          duration: 3000
        })
      }
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 10px;
}

.login-header p {
  font-size: 14px;
  color: #666;
}

.login-form {
  margin-top: 20px;
}

.submit-btn {
  width: 100%;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
}

/* 修复浏览器自动填充的蓝色背景问题 */
.login-form :deep(.el-input__wrapper) {
  background-color: #ffffff !important;
}

.login-form :deep(.el-input__inner) {
  background-color: #ffffff !important;
  color: #606266 !important;
}

/* 移除可能的选中状态样式 */
.login-form :deep(.el-input) {
  background-color: transparent !important;
}

.login-form :deep(.el-input.is-focus .el-input__wrapper) {
  background-color: #ffffff !important;
}

/* 针对Webkit内核浏览器的自动填充样式 */
.login-form :deep(.el-input__inner:-webkit-autofill),
.login-form :deep(.el-input__inner:-webkit-autofill:hover),
.login-form :deep(.el-input__inner:-webkit-autofill:focus),
.login-form :deep(.el-input__inner:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px white inset !important;
  -webkit-text-fill-color: #606266 !important;
  background-color: transparent !important;
  background-image: none !important;
  transition: background-color 5000s ease-in-out 0s !important;
}

/* 额外的兼容性修复 */
.login-form :deep(input:-webkit-autofill),
.login-form :deep(input:-webkit-autofill:hover),
.login-form :deep(input:-webkit-autofill:focus),
.login-form :deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px white inset !important;
  -webkit-text-fill-color: #606266 !important;
  background-color: white !important;
  transition: background-color 5000s ease-in-out 0s !important;
}

/* 强制移除任何可能的选中背景 */
.login-form input,
.login-form :deep(input) {
  background-color: white !important;
  background-image: none !important;
}

/* 针对可能的浏览器默认样式 */
.login-form :deep(.el-input__inner:focus) {
  background-color: white !important;
  background-image: none !important;
}

@media (max-width: 768px) {
  .login-box {
    width: 90%;
    max-width: 400px;
    padding: 2rem 1.5rem;
    margin: 1rem;
  }

  .login-title {
    font-size: 1.5rem;
  }

  .logo-icon {
    font-size: 2.5rem;
  }

  .el-form-item {
    margin-bottom: 1.25rem;
  }

  .register-hint {
    font-size: 0.875rem;
  }
}
</style>

