# 前端 Dockerfile
FROM node:18-alpine AS builder

# 使用腾讯云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 使用腾讯云 npm 镜像源
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# 安装依赖
RUN npm install --legacy-peer-deps --prefer-offline --no-audit --progress=false

# 复制源代码
COPY . .

# 清除 Vite 缓存，确保每次构建都是最新的
RUN rm -rf node_modules/.vite .vite

# 构建应用（生产环境，跳过类型检查以避免 vue-tsc 版本问题）
RUN npx vite build

# 生产环境 - 使用 Nginx
FROM nginx:alpine

# 使用腾讯云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.cloud.tencent.com/g' /etc/apk/repositories

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

