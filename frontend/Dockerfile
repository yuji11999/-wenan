# 前端 Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 可按需覆盖 npm registry，例如：
# docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY"

# 安装依赖
RUN npm ci --legacy-peer-deps --no-audit --progress=false

# 复制源代码
COPY . .

# 清除 Vite 缓存，确保每次构建都是最新的
RUN rm -rf node_modules/.vite .vite

# 构建应用（包含 vue-tsc 类型检查）
RUN npm run build

# 生产环境 - 使用 Nginx
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 4001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4001/ || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
