# 后端 Dockerfile - 使用 Debian Slim 解决 OpenSSL 兼容性问题
FROM node:18-slim AS builder

# 安装构建工具（bcrypt 和 Prisma 需要）- 这层会被缓存
RUN apt-get update && apt-get install -y \
    python3 make g++ openssl libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 第1层缓存：只复制依赖文件（package.json 不变时，npm install 会被缓存）
COPY package.json package-lock.json ./

# 第2层缓存：只复制 Prisma 相关文件（schema 不变时，不会重新生成）
COPY prisma ./prisma/

# 可按需覆盖 npm registry，例如：
# docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY"

# 第3层缓存：安装依赖（只有 package.json/package-lock.json 变化时才重新执行）
RUN npm ci --legacy-peer-deps --no-audit --progress=false

# 第4层缓存：生成 Prisma Client（只有 schema 变化时才重新执行）
RUN npx prisma generate

# 第5层：复制源代码（代码变化不会导致重新安装依赖）
COPY src ./src
COPY tsconfig.json nest-cli.json ./

# 第6层：构建应用（只有代码变化时才重新构建）
RUN npm run build

# 生产环境镜像 - 直接使用 builder 的内容，避免重复编译
FROM node:18-slim

# 安装运行时依赖（只需要这些，不需要编译工具）
RUN apt-get update && apt-get install -y \
    curl openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 从构建阶段复制所有必要文件（包括已编译的 node_modules）
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 复制启动脚本
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 暴露端口
EXPOSE 4000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4000/ || exit 1

# 启动应用
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
