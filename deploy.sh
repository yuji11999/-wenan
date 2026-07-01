#!/usr/bin/env bash

# 短视频文案系统 - Docker 一键部署脚本
# 数据库、后端、前端都由 docker compose 管理。

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_URL_HOST="${APP_URL_HOST:-localhost}"
INITIAL_ADMIN_USERNAME="${INITIAL_ADMIN_USERNAME:-admin}"

echo "================================================"
echo "短视频文案系统 - Docker 一键部署"
echo "================================================"

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行或未安装${NC}"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo -e "${RED}错误: 未找到 docker compose 或 docker-compose${NC}"
    exit 1
fi

random_secret() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
    else
        date +%s%N | sha256sum | awk '{print $1}'
    fi
}

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}未发现 .env，正在生成本机部署配置...${NC}"
    cat > .env <<EOF
MYSQL_ROOT_PASSWORD=$(random_secret)
MYSQL_DATABASE=duanshipin
MYSQL_USER=duanshipin
MYSQL_PASSWORD=$(random_secret)
BACKEND_PORT=4000
BACKEND_BIND_HOST=127.0.0.1
FRONTEND_PORT=4001
JWT_SECRET=$(random_secret)
ENCRYPTION_KEY=$(random_secret)
EOF
    echo -e "${GREEN}已生成 .env，请妥善保存，后续重装/迁移需要继续使用这份配置。${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 1/5: 校验 compose 配置${NC}"
$COMPOSE --env-file .env config >/dev/null

echo ""
echo -e "${YELLOW}步骤 2/5: 构建并启动服务${NC}"
$COMPOSE --env-file .env up -d --build

echo ""
echo -e "${YELLOW}步骤 3/5: 等待服务健康${NC}"
MAX_RETRIES=60
RETRY_COUNT=0
while [ "$RETRY_COUNT" -lt "$MAX_RETRIES" ]; do
    BACKEND_HEALTH="$(docker inspect -f '{{.State.Health.Status}}' duanshipin-backend 2>/dev/null || true)"
    FRONTEND_HEALTH="$(docker inspect -f '{{.State.Health.Status}}' duanshipin-frontend 2>/dev/null || true)"
    if [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ]; then
        echo -e "${GREEN}服务已全部健康${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "等待中... backend=${BACKEND_HEALTH:-unknown}, frontend=${FRONTEND_HEALTH:-unknown} ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

if [ "$RETRY_COUNT" -eq "$MAX_RETRIES" ]; then
    echo -e "${RED}服务健康检查超时，最近日志如下:${NC}"
    $COMPOSE --env-file .env logs --tail=120 mysql backend frontend
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 4/5: 初始化管理员账号${NC}"
INITIAL_ADMIN_PASSWORD="$(random_secret)"
if ! ADMIN_OUTPUT="$(docker exec \
    -e ADMIN_USERNAME="$INITIAL_ADMIN_USERNAME" \
    -e ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
    duanshipin-backend npm run create-admin 2>&1)"; then
    echo "$ADMIN_OUTPUT"
    exit 1
fi
echo "$ADMIN_OUTPUT"

echo ""
echo -e "${YELLOW}步骤 5/5: 部署信息${NC}"
FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2-)"
BACKEND_PORT="$(grep -E '^BACKEND_PORT=' .env | cut -d= -f2-)"
BACKEND_BIND_HOST="$(grep -E '^BACKEND_BIND_HOST=' .env | cut -d= -f2- || true)"
BACKEND_BIND_HOST="${BACKEND_BIND_HOST:-127.0.0.1}"

echo ""
echo "================================================"
echo -e "${GREEN}部署完成${NC}"
echo "================================================"
echo "前端: http://${APP_URL_HOST}:${FRONTEND_PORT:-4001}"
echo "后端本机地址: http://${BACKEND_BIND_HOST}:${BACKEND_PORT:-4000}"
echo "API 文档本机地址: http://${BACKEND_BIND_HOST}:${BACKEND_PORT:-4000}/api-docs"
if echo "$ADMIN_OUTPUT" | grep -q '管理员账号创建成功'; then
    echo ""
    echo "初始管理员:"
    echo "  用户名: ${INITIAL_ADMIN_USERNAME}"
    echo "  密码: ${INITIAL_ADMIN_PASSWORD}"
    echo "  请登录后立即修改密码。"
fi
echo ""
echo "常用命令:"
echo "  $COMPOSE --env-file .env logs -f"
echo "  $COMPOSE --env-file .env ps"
echo "  $COMPOSE --env-file .env down"
echo ""
echo "说明:"
echo "  MySQL 数据保存在 docker compose 项目下的 mysql_data 命名数据卷中"
echo "  数据库结构在后端容器启动时通过 prisma migrate deploy 自动初始化/迁移"
echo "  大模型 API Key 由管理员在前端系统设置中配置，不写入部署环境变量"
