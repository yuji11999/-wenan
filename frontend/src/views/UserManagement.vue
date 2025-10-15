<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
      <p>管理系统用户的审核和状态</p>
    </div>

    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="180" />
        
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column prop="loginAttempts" label="登录状态" width="120">
          <template #default="{ row }">
            <el-tooltip v-if="row.lockedUntil && new Date(row.lockedUntil) > new Date()" 
              content="账号已锁定" placement="top">
              <el-tag type="danger">已锁定</el-tag>
            </el-tooltip>
            <el-tooltip v-else-if="row.loginAttempts > 0" 
              :content="`登录失败 ${row.loginAttempts} 次`" placement="top">
              <el-tag type="warning">有失败</el-tag>
            </el-tooltip>
            <el-tag v-else type="success">正常</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="lastLoginAt" label="最后登录" width="180">
          <template #default="{ row }">
            <div v-if="row.lastLoginAt">
              <div>{{ formatDate(row.lastLoginAt) }}</div>
              <div class="text-sm text-gray-500">{{ row.lastLoginIp }}</div>
            </div>
            <span v-else class="text-gray-400">从未登录</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="400">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                @click="updateStatus(row.id, 'approved')"
              >
                通过
              </el-button>
              
              <el-button
                v-if="row.status === 'pending'"
                type="danger"
                size="small"
                @click="updateStatus(row.id, 'rejected')"
              >
                拒绝
              </el-button>

              <el-button
                v-if="row.status === 'approved'"
                type="warning"
                size="small"
                @click="updateStatus(row.id, 'disabled')"
              >
                禁用
              </el-button>

              <el-button
                v-if="row.status === 'disabled'"
                type="success"
                size="small"
                @click="updateStatus(row.id, 'approved')"
              >
                启用
              </el-button>

              <el-button
                v-if="row.status === 'rejected'"
                type="success"
                size="small"
                @click="updateStatus(row.id, 'approved')"
              >
                通过
              </el-button>
            </el-button-group>

            <!-- 会话管理按钮 -->
            <el-button-group class="ml-2">
              <el-button
                v-if="row.lockedUntil && new Date(row.lockedUntil) > new Date()"
                type="info"
                size="small"
                @click="unlockUser(row.id)"
              >
                解锁
              </el-button>

              <el-button
                type="primary"
                size="small"
                @click="viewUserSessions(row)"
              >
                会话
              </el-button>

              <el-button
                type="danger"
                size="small"
                @click="forceLogoutUser(row)"
              >
                强制登出
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 用户会话管理对话框 -->
    <el-dialog
      v-model="sessionDialogVisible"
      :title="`${currentUser?.username} 的会话管理`"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="session-tabs">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="活跃会话" name="sessions">
            <el-table :data="userSessions" v-loading="sessionLoading" stripe>
              <el-table-column prop="ipAddress" label="IP地址" width="150" />
              
              <el-table-column prop="userAgent" label="设备信息" min-width="200">
                <template #default="{ row }">
                  <div class="user-agent">
                    {{ parseUserAgent(row.userAgent) }}
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="lastUsed" label="最后使用" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.lastUsed) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="createdAt" label="登录时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    size="small"
                    @click="forceLogoutSession(row.id)"
                  >
                    踢出
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="登录日志" name="logs">
            <div class="log-filters mb-4">
              <el-row :gutter="16">
                <el-col :span="6">
                  <el-select v-model="logFilters.success" placeholder="登录结果" clearable>
                    <el-option label="全部" :value="undefined" />
                    <el-option label="成功" :value="true" />
                    <el-option label="失败" :value="false" />
                  </el-select>
                </el-col>
                <el-col :span="8">
                  <el-date-picker
                    v-model="logFilters.dateRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                  />
                </el-col>
                <el-col :span="4">
                  <el-button type="primary" @click="loadLoginLogs">搜索</el-button>
                </el-col>
              </el-row>
            </div>
            
            <el-table :data="loginLogs" v-loading="logLoading" stripe>
              <el-table-column prop="ipAddress" label="IP地址" width="150" />
              
              <el-table-column prop="success" label="结果" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.success ? 'success' : 'danger'">
                    {{ row.success ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="failReason" label="失败原因" min-width="150">
                <template #default="{ row }">
                  <span v-if="!row.success" class="text-red-600">
                    {{ row.failReason || '未知原因' }}
                  </span>
                  <span v-else class="text-green-600">-</span>
                </template>
              </el-table-column>
              
              <el-table-column prop="userAgent" label="设备信息" min-width="200">
                <template #default="{ row }">
                  {{ parseUserAgent(row.userAgent) }}
                </template>
              </el-table-column>
              
              <el-table-column prop="createdAt" label="时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import dayjs from 'dayjs'

interface User {
  id: string
  username: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
  loginAttempts?: number
  lockedUntil?: string
  lastLoginAt?: string
  lastLoginIp?: string
}

interface UserSession {
  id: string
  ipAddress: string
  userAgent: string
  lastUsed: string
  createdAt: string
  expiresAt: string
}

interface LoginLog {
  id: string
  username: string
  ipAddress: string
  userAgent: string
  success: boolean
  failReason?: string
  createdAt: string
}

const users = ref<User[]>([])
const loading = ref(false)

// 会话管理相关
const sessionDialogVisible = ref(false)
const currentUser = ref<User | null>(null)
const activeTab = ref('sessions')
const userSessions = ref<UserSession[]>([])
const sessionLoading = ref(false)

// 登录日志相关
const loginLogs = ref<LoginLog[]>([])
const logLoading = ref(false)
const logFilters = ref({
  success: undefined as boolean | undefined,
  dateRange: [] as string[]
})

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    disabled: 'info'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    disabled: '已禁用'
  }
  return texts[status] || status
}

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 解析User-Agent信息
const parseUserAgent = (userAgent: string) => {
  if (!userAgent || userAgent === 'unknown') return '未知设备'
  
  // 简单的User-Agent解析
  if (userAgent.includes('Chrome')) {
    if (userAgent.includes('Mobile')) return 'Chrome 移动版'
    return 'Chrome 浏览器'
  }
  if (userAgent.includes('Firefox')) return 'Firefox 浏览器'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari 浏览器'
  if (userAgent.includes('Edge')) return 'Edge 浏览器'
  
  return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await api.get('/auth/users')
    users.value = response
  } catch (error: any) {
    ElMessage.error({ message: error.response?.data?.message || '获取用户列表失败', duration: 2000 })
  } finally {
    loading.value = false
  }
}

const updateStatus = async (userId: string, status: string) => {
  const statusTexts: Record<string, string> = {
    approved: '通过',
    rejected: '拒绝',
    disabled: '禁用'
  }

  try {
    await ElMessageBox.confirm(
      `确定要${statusTexts[status]}该用户吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.put(`/auth/users/${userId}/status`, { status })
    ElMessage.success({ message: '操作成功', duration: 1500 })
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ message: error.response?.data?.message || '操作失败', duration: 2000 })
    }
  }
}

// ==================== 会话管理方法 ====================

// 解锁用户账号
const unlockUser = async (userId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要解锁该用户账号吗？',
      '确认解锁',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.put(`/auth/users/${userId}/unlock`)
    ElMessage.success({ message: '用户账号已解锁', duration: 1500 })
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ message: error.response?.data?.message || '解锁失败', duration: 2000 })
    }
  }
}

// 查看用户会话
const viewUserSessions = async (user: User) => {
  currentUser.value = user
  sessionDialogVisible.value = true
  activeTab.value = 'sessions'
  
  // 加载用户会话
  await loadUserSessions(user.id)
  // 加载登录日志
  await loadLoginLogs(user.username)
}

// 加载用户会话
const loadUserSessions = async (userId: string) => {
  sessionLoading.value = true
  try {
    const response = await api.get(`/auth/users/${userId}/sessions`)
    userSessions.value = response
  } catch (error: any) {
    ElMessage.error({ message: error.response?.data?.message || '获取会话列表失败', duration: 2000 })
  } finally {
    sessionLoading.value = false
  }
}

// 加载登录日志
const loadLoginLogs = async (username?: string) => {
  logLoading.value = true
  try {
    const params: any = { limit: 50 }
    
    if (username) {
      params.username = username
    }
    
    if (logFilters.value.success !== undefined) {
      params.success = logFilters.value.success
    }
    
    if (logFilters.value.dateRange.length === 2) {
      params.startDate = logFilters.value.dateRange[0]
      params.endDate = logFilters.value.dateRange[1]
    }
    
    const response = await api.get('/auth/logs/login', { params })
    loginLogs.value = response
  } catch (error: any) {
    ElMessage.error({ message: error.response?.data?.message || '获取登录日志失败', duration: 2000 })
  } finally {
    logLoading.value = false
  }
}

// 强制登出用户的所有会话
const forceLogoutUser = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要强制登出用户 "${user.username}" 的所有会话吗？`,
      '确认强制登出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.delete(`/auth/users/${user.id}/sessions`)
    ElMessage.success({ message: '用户已强制登出', duration: 1500 })
    
    // 如果会话对话框打开，刷新会话列表
    if (sessionDialogVisible.value && currentUser.value?.id === user.id) {
      await loadUserSessions(user.id)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ message: error.response?.data?.message || '强制登出失败', duration: 2000 })
    }
  }
}

// 强制登出指定会话
const forceLogoutSession = async (sessionId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要踢出该会话吗？',
      '确认踢出',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await api.delete(`/auth/sessions/${sessionId}`)
    ElMessage.success({ message: '会话已踢出', duration: 1500 })
    
    // 刷新会话列表
    if (currentUser.value) {
      await loadUserSessions(currentUser.value.id)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error({ message: error.response?.data?.message || '踢出会话失败', duration: 2000 })
    }
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 14px;
  color: #666;
}

.ml-2 {
  margin-left: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}

.text-sm {
  font-size: 12px;
}

.text-gray-500 {
  color: #909399;
}

.text-gray-400 {
  color: #c0c4cc;
}

.text-red-600 {
  color: #f56c6c;
}

.text-green-600 {
  color: #67c23a;
}

.user-agent {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
}

.session-tabs {
  min-height: 400px;
}

.log-filters {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>

