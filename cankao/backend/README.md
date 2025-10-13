# 短视频文案系统 - 后端服务

基于 Nest.js + TypeScript + Prisma + MySQL 的短视频文案系统后端 API 服务。

## 技术栈

- **核心框架**: Nest.js 10.0+
- **编程语言**: TypeScript 5.1+
- **数据库**: MySQL 8.0+
- **ORM**: Prisma 5.7+
- **认证**: JWT + Passport
- **API 文档**: Swagger
- **HTTP 客户端**: Axios
- **加密**: Bcrypt

## 项目结构

```
backend/
├── prisma/
│   └── schema.prisma      # Prisma 数据库模型
├── src/
│   ├── auth/              # 认证模块
│   │   ├── dto/           # 数据传输对象
│   │   ├── guards/        # 守卫
│   │   ├── strategies/    # Passport 策略
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── copywriting/       # 文案管理模块
│   │   ├── dto/
│   │   ├── copywriting.controller.ts
│   │   ├── copywriting.service.ts
│   │   └── copywriting.module.ts
│   ├── ai/                # AI 服务模块
│   │   ├── ai.service.ts
│   │   └── ai.module.ts
│   ├── prisma/            # Prisma 模块
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.controller.ts  # 应用控制器
│   ├── app.service.ts     # 应用服务
│   ├── app.module.ts      # 应用模块
│   └── main.ts            # 应用入口
├── .env.example           # 环境变量示例（MySQL）
├── nest-cli.json          # Nest CLI 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 项目依赖

```

## 数据库模型

### 核心表结构

#### 用户表 (users)
- 用户基本信息（用户名、邮箱、密码）
- 角色管理
- 创建/更新时间

#### 文案表 (copywritings)
- 文案内容和标题
- 视频链接（可选）
- 行业分类
- 来源类型：original(原创) / rewrite(仿写) / revision(改写)
- 关联源文案ID

#### 文案拆解分析表 (copywriting_analyses)
- 原始文案
- 拆解维度：话题、钩子、金句、广告植入、内容
- 位置标记 (JSON)
- AI 识别置信度
- 人工修改标记

#### 文案关联关系表 (copywriting_relations)
- 父文案ID / 子文案ID
- 关系类型：rewrite / revision
- 仿写策略 / 改写类型
- 外部参考文案标记

#### 爆款分析表 (viral_analyses)
- 综合评分 (0-100)
- 各维度评分：话题热度、钩子强度、情绪共鸣、传播潜力、转化力
- 为什么会火的原因 (JSON)
- 改进建议 (JSON)

#### 素材库表 (materials)
- 素材类型和内容
- 使用次数
- 热度评分

#### 热门榜单表 (trendings)
- 热门类型和内容
- 排名
- 行业分类

## 环境配置

### 1. 复制环境变量文件

```bash
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
# 数据库配置（MySQL）
DATABASE_URL="mysql://user:password@localhost:3306/copywriting"

# JWT 配置
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# 服务配置
PORT=3001
NODE_ENV=development

# OpenAI 配置
OPENAI_API_KEY="your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-3.5-turbo"
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
cd backend
npm install
# 或
pnpm install
```

### 数据库初始化

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# （可选）查看数据库 / 打开 Prisma Studio
npx prisma studio
```

### 开发模式

```bash
npm run start:dev
# 或
pnpm start:dev
```

服务将运行在 http://localhost:3001

API 文档：http://localhost:3001/api-docs

### 生产构建

```bash
# 构建
npm run build

# 运行
npm run start:prod
```

## API 接口

### 认证模块

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录

### 文案管理模块

- `POST /copywriting/deconstruct` - 文案拆解
- `POST /copywriting/analyze` - 分析文案
- `POST /copywriting/create` - 创建原创文案
- `POST /copywriting/rewrite` - 文案仿写
- `GET /copywriting` - 获取文案列表
- `GET /copywriting/:id` - 获取文案详情
- `DELETE /copywriting/:id` - 删除文案

所有文案相关接口需要 JWT 认证。

## AI 服务

### 支持的AI服务商

1. **OpenAI (GPT)**
   - 模型：gpt-3.5-turbo / gpt-4
   - 配置：OPENAI_API_KEY, OPENAI_BASE_URL

2. **阿里通义千问** (可选)
   - 配置：QWEN_API_KEY, QWEN_BASE_URL

3. **百度文心一言** (可选)
   - 配置：WENXIN_API_KEY, WENXIN_BASE_URL

### AI 功能

- **文案拆解**: 自动提取话题、钩子、金句、广告植入等维度
- **文案分析**: 分析爆款潜力，提供改进建议
- **文案仿写**: 根据参考文案和新内容生成仿写

### Mock 模式

如果未配置 AI API Key，系统将自动使用模拟数据，确保功能正常运行。

## 数据库管理

### Prisma 常用命令

```bash
# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name migration_name

# 应用迁移
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset

# 打开数据库管理界面
npx prisma studio

# 格式化 schema
npx prisma format
```

### 数据备份

```bash
# 导出/导入（按你的 MySQL 客户端习惯）
# 导出
mysqldump -u user -p copywriting > backup.sql
# 导入
mysql -u user -p copywriting < backup.sql
```

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 使用 ESLint + Prettier 格式化代码
- 遵循 Nest.js 最佳实践

### 模块化设计

- 每个功能模块独立目录
- 使用 DTO 进行数据验证
- 使用 Guards 进行权限控制
- 使用 Interceptors 进行数据转换

### API 设计规范

- RESTful API 设计
- 统一的响应格式
- 错误处理和异常捕获
- 请求参数验证

## 测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -t copywriting-backend .

# 运行容器
docker run -p 3001:3001 --env-file .env copywriting-backend
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/main.js --name copywriting-backend

# 查看日志
pm2 logs copywriting-backend

# 重启服务
pm2 restart copywriting-backend
```

## 性能优化

- 数据库查询优化（索引、分页）
- Redis 缓存热点数据
- AI 请求结果缓存
- 批量操作优化
- 数据库连接池管理

## 安全建议

- 使用 HTTPS 协议
- JWT Token 过期机制
- 密码加密存储（Bcrypt）
- SQL 注入防护（Prisma）
- XSS 防护
- CORS 配置
- 接口限流（Rate Limiting）
- 敏感数据加密

## 监控与日志

- 集成日志系统（Winston / Pino）
- 错误追踪（Sentry）
- 性能监控（New Relic / Datadog）
- 健康检查端点：`GET /health`

## 待完成功能

- [ ] Redis 缓存集成
- [ ] 消息队列（Bull / RabbitMQ）
- [ ] 文件上传（MinIO / OSS）
- [ ] 数据统计和报表
- [ ] 定时任务（爬取热搜）
- [ ] WebSocket 实时通信
- [ ] 多语言支持

## 相关文档

- [Nest.js 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [MySQL 文档](https://dev.mysql.com/doc/)
- [Swagger 文档](https://swagger.io/docs/)

## 许可证

MIT

