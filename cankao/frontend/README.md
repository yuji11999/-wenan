# 短视频文案系统 - 前端项目

基于 Vue 3 + TypeScript + Element Plus 的短视频文案创作辅助系统前端应用。

## 技术栈

- **核心框架**: Vue 3.4+ (Composition API)
- **构建工具**: Vite 5.0+
- **编程语言**: TypeScript 5.3+
- **UI 组件库**: Element Plus 2.4+
- **状态管理**: Pinia 2.1+
- **路由管理**: Vue Router 4.2+
- **HTTP 客户端**: Axios 1.6+
- **CSS 框架**: TailwindCSS 3.4+
- **工具库**: 
  - VueUse (响应式工具集)
  - Day.js (时间处理)
  - Lodash-es (工具函数)

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口封装
│   │   ├── index.ts      # Axios 实例配置
│   │   └── copywriting.ts # 文案相关API
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── layouts/          # 布局组件
│   │   └── MainLayout.vue # 主布局
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── stores/           # Pinia 状态管理
│   │   ├── app.ts        # 应用全局状态
│   │   └── copywriting.ts # 文案状态
│   ├── views/            # 页面组件
│   │   ├── Dashboard.vue  # 工作台
│   │   ├── Deconstruct.vue # 文案拆解
│   │   ├── Create.vue     # 原创创作
│   │   ├── Rewrite.vue    # 文案仿写
│   │   ├── Revise.vue     # 文案改写
│   │   ├── Library.vue    # 素材库
│   │   └── Settings.vue   # 系统设置
│   ├── App.vue           # 根组件
│   ├── main.ts           # 应用入口
│   └── style.css         # 全局样式
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── tailwind.config.js    # TailwindCSS 配置
└── package.json          # 项目依赖

```

## 功能模块

### 1. 工作台 (Dashboard)
- 快速入口（文案拆解、原创创作、文案仿写、素材库）
- 最近编辑文案列表
- 数据统计概览

### 2. 文案拆解 (Deconstruct)
- 视频链接输入（可选）
- AI 自动拆解文案
- 人工修正拆解结果
- 拆解维度：话题、钩子、金句、广告、内容、标签、行业

### 3. 原创文案创作 (Create)
- 左右两栏布局：参考文案 vs 创作文案
- 双分析系统：参考分析 + 创作分析
- 提炼内容：话题、钩子、金句、广告
- 为什么会火分析
- 改进建议

### 4. 文案仿写 (Rewrite)
- 两种模式：从素材库选择 / 直接输入文案
- 素材库搜索功能
- 仿写类型选择：结构/风格/钩子/混合
- AI 生成仿写文案
- 自动关联原文案（追溯功能）

### 5. 文案改写 (Revise)
- 功能开发中

### 6. 素材库 (Library)
- 文案列表展示
- 搜索和筛选功能
- 行业分类
- 来源标识：原创/仿写/改写

### 7. 系统设置 (Settings)
- AI 配置（服务商、API Key、Base URL）
- 提示词管理
- 数据管理（导出/导入/清空）
- 系统信息

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
cd frontend
npm install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
pnpm dev
```

访问 http://localhost:3000

### 生产构建

```bash
npm run build
# 或
pnpm build
```

构建产物位于 `dist/` 目录

### 预览生产构建

```bash
npm run preview
# 或
pnpm preview
```

## 响应式设计

系统采用移动优先的响应式设计策略：

### 断点设置

- **移动端**: <= 768px
- **平板**: 769px - 1024px  
- **PC端**: >= 1025px

### 移动端适配

- 单列布局，全屏展示
- 底部 Tab 导航
- 触摸手势支持
- 简化操作流程

### PC端特性

- 多列布局，完整功能
- 顶部导航 + 侧边栏
- 鼠标悬停效果
- 键盘快捷键

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 使用 Composition API
- 组件使用 `<script setup>` 语法
- 样式使用 scoped CSS + TailwindCSS

### 命名规范

- 组件文件：PascalCase (例如：`MainLayout.vue`)
- 组件名称：PascalCase (例如：`<MainLayout>`)
- 函数/变量：camelCase (例如：`getUserInfo`)
- 常量：UPPER_SNAKE_CASE (例如：`API_BASE_URL`)

### Git 提交规范

```
feat: 新功能
fix: 修复Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

## API 接口

前端通过 Axios 与后端 API 通信，接口地址配置在 `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

## 待完成功能

- [ ] 用户登录/注册
- [ ] 文案详情页
- [ ] 文案关系图谱
- [ ] 数据分析看板
- [ ] PWA 支持
- [ ] 拍照识别文案（OCR）
- [ ] 语音输入（ASR）

## 后续优化

- [ ] 单元测试
- [ ] E2E 测试
- [ ] 性能优化（虚拟滚动、懒加载）
- [ ] 暗黑模式
- [ ] 国际化 (i18n)
- [ ] 离线支持

## 相关文档

- [Vue 3 文档](https://cn.vuejs.org/)
- [Vite 文档](https://cn.vitejs.dev/)
- [Element Plus 文档](https://element-plus.org/zh-CN/)
- [Pinia 文档](https://pinia.vuejs.org/zh/)
- [TailwindCSS 文档](https://tailwindcss.com/)

## 许可证

MIT





