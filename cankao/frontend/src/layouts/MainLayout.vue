<template>
  <div class="main-layout">
    <!-- PC端顶部导航 -->
    <header class="header">
      <div class="header-content">
        <div class="logo">
          <span>✍️</span>
          <span>短视频文案系统</span>
        </div>
        <!-- 移动端标题 -->
        <div class="mobile-title">
          {{ pageTitle }}
        </div>
        <nav class="nav-menu">
          <div
            v-for="item in navItems"
            :key="item.path"
            class="nav-item"
            :class="{ active: $route.path.includes(item.path) }"
            @click="navigateTo(item.path)"
          >
            {{ item.name }}
          </div>
        </nav>
        <div class="user-info">
          <el-dropdown @command="handleCommand">
            <el-button type="primary" size="small">
              {{ userStore.user?.username }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="container">
      <router-view />
    </main>

    <!-- 移动端底部导航 -->
    <div class="mobile-nav">
      <div class="mobile-nav-items">
        <div
          v-for="item in mobileNavItems"
          :key="item.path"
          class="mobile-nav-item"
          :class="{ active: $route.path.includes(item.path) }"
          @click="navigateTo(item.path)"
        >
          <span class="emoji">{{ item.icon }}</span>
          <span>{{ item.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useCopywritingStore } from '@/stores/copywriting'
import { useCategoryStore } from '@/stores/category'
import { useAIStore } from '@/stores/ai'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const copywritingStore = useCopywritingStore()
const categoryStore = useCategoryStore()
const aiStore = useAIStore()

const navItems = computed(() => {
  const items = [
    { name: '工作台', path: '/dashboard' },
    { name: '文案拆解', path: '/deconstruct' },
    { name: '原创创作', path: '/create' },
    { name: '文案仿写', path: '/rewrite' },
    { name: '素材库', path: '/library' }
  ]

  // 只有管理员才能看到设置菜单
  if (userStore.isAdmin) {
    items.push({ name: '设置', path: '/settings' })
  }

  return items
})

const mobileNavItems = computed(() => {
  const items = [
    { name: '工作台', path: '/dashboard', icon: '🏠' },
    { name: '创作', path: '/create', icon: '✏️' },
    { name: '素材库', path: '/library', icon: '📚' }
  ]

  // 只有管理员才能看到设置选项
  if (userStore.isAdmin) {
    items.push({ name: '更多', path: '/settings', icon: '⚙️' })
  }

  return items
})

// 根据当前路由获取页面标题
const pageTitle = computed(() => {
  const path = route.path
  const titleMap: Record<string, string> = {
    '/dashboard': '工作台',
    '/deconstruct': '文案拆解',
    '/create': '原创创作',
    '/rewrite': '文案仿写',
    '/revise': '文案优化',
    '/library': '素材库',
    '/settings': '设置',
    '/user-management': '用户管理'
  }
  return titleMap[path] || '短视频文案系统'
})

const navigateTo = (path: string) => {
  router.push(path)
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      // 清理所有 stores 的数据，避免切换用户时数据混乱
      copywritingStore.resetStore()
      categoryStore.resetStore()
      aiStore.resetStore()
      userStore.logout()
      
      ElMessage.success('已退出登录')
      router.push('/login')
    } catch {
      // 用户取消
    }
  } else if (command === 'profile') {
    ElMessage.info('个人信息功能开发中')
  }
}
</script>

<style scoped>
.main-layout {
  width: 100%;
  min-height: 100vh;
  padding-bottom: 70px;
}

.header {
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid #f0f0f0;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-title {
  display: none;
}

.nav-menu {
  display: flex;
  gap: 2rem;
}

.nav-item {
  cursor: pointer;
  padding: 0.5rem 1rem;
  color: var(--text-secondary);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: var(--primary-color);
}

.nav-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 600;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: white;
  box-shadow: 0 -1px 8px rgba(0, 0, 0, 0.06);
  padding: 4px 0 calc(4px + env(safe-area-inset-bottom));
  z-index: 100;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.mobile-nav-items {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  width: 100%;
  height: 100%;
  align-items: center;
  margin: 0;
  padding: 0;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  color: #999;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  width: 100%;
  height: 100%;
}

.mobile-nav-item:active {
  background: rgba(0, 0, 0, 0.03);
  transform: scale(0.95);
}

.mobile-nav-item.active {
  color: var(--primary-color);
  font-weight: 500;
}

.mobile-nav-item .emoji {
  font-size: 22px;
  display: block;
  margin-bottom: 2px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.mobile-nav-item.active .emoji {
  transform: scale(1.05);
}

.mobile-nav-item:not(.active) .emoji {
  opacity: 0.5;
}

/* 响应式 - 移动端 */
@media (max-width: 768px) {
  .header {
    background: white;
    box-shadow: none;
    border-bottom: 1px solid #f5f5f5;
    padding: 8px 12px;
    position: static;
  }

  .header-content {
    height: auto;
    min-height: 44px;
    justify-content: center;
    position: relative;
  }

  .logo {
    display: none;
  }

  .mobile-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .nav-menu {
    display: none;
  }

  .user-info {
    position: absolute;
    right: 0;
    font-size: 0.875rem;
  }

  .user-info .el-button {
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
  }

  .container {
    padding: 0.75rem;
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }

  .mobile-nav {
    display: flex;
  }

  .main-layout {
    padding-bottom: 0;
  }
}

/* 小屏手机优化（更紧凑） */
@media (max-width: 375px) {
  .mobile-nav {
    padding: 3px 0 calc(3px + env(safe-area-inset-bottom));
  }

  .mobile-nav-item {
    font-size: 9px;
    padding: 5px 0;
  }

  .mobile-nav-item .emoji {
    font-size: 20px;
    margin-bottom: 1px;
  }

  .container {
    padding-bottom: calc(50px + env(safe-area-inset-bottom));
  }
}

/* 超大屏手机优化（稍微放大） */
@media (min-width: 430px) and (max-width: 768px) {
  .mobile-nav {
    padding: 5px 0 calc(5px + env(safe-area-inset-bottom));
  }

  .mobile-nav-item {
    padding: 7px 0;
    font-size: 11px;
  }

  .mobile-nav-item .emoji {
    font-size: 24px;
    margin-bottom: 3px;
  }

  .container {
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }
}
</style>





