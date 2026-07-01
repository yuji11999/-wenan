import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { useUserStore } from '@/stores/user'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', requiresAuth: true }
      },
      {
        path: 'deconstruct',
        name: 'Deconstruct',
        component: () => import('@/views/Deconstruct.vue'),
        meta: { title: '文案拆解', requiresAuth: true }
      },
      {
        path: 'create',
        name: 'Create',
        component: () => import('@/views/Create.vue'),
        meta: { title: '原创文案创作', requiresAuth: true }
      },
      {
        path: 'rewrite',
        name: 'Rewrite',
        component: () => import('@/views/Rewrite.vue'),
        meta: { title: '文案仿写', requiresAuth: true }
      },
      {
        path: 'revise',
        name: 'Revise',
        component: () => import('@/views/Revise.vue'),
        meta: { title: '文案改写', requiresAuth: true }
      },
      {
        path: 'library',
        name: 'Library',
        component: () => import('@/views/Library.vue'),
        meta: { title: '素材库', requiresAuth: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        redirect: '/settings'
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  // 初始化用户信息
  if (!userStore.user && localStorage.getItem('token')) {
    userStore.initFromStorage()
  }

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 短视频文案系统`
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!userStore.isLoggedIn) {
      // 未登录，跳转到登录页
      next('/login')
      return
    }

    // 检查用户状态
    if (!userStore.isApproved) {
      // 用户未审核通过
      alert('您的账号尚未审核通过，请等待管理员审核')
      userStore.logout()
      next('/login')
      return
    }

    // 检查是否需要管理员权限
    if (to.meta.requiresAdmin && !userStore.isAdmin) {
      alert('您没有权限访问此页面')
      next('/dashboard')
      return
    }
  }

  // 已登录用户访问登录页，重定向到工作台
  if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
    return
  }

  next()
})

export default router





