#!/bin/bash

# 短视频文案系统 - 部署脚本
# 用于在宝塔面板 Docker 环境中快速部署

set -e

echo "================================================"
echo "短视频文案系统 - Docker 部署脚本"
echo "================================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否存在 .env.production 文件
if [ ! -f ".env.production" ]; then
    echo -e "${RED}错误: .env.production 文件不存在${NC}"
    echo "请先复制 .env.production 文件并配置相关参数"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行或未安装${NC}"
    exit 1
fi

# 检查 docker-compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: docker-compose 未安装${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 1/6: 检查数据库连接${NC}"
echo "正在检查 MySQL 数据库..."
if docker run --rm --network host mysql:5.7 mysqladmin ping -h127.0.0.1 -P3306 -uduanshipin -pKEpYWdYx3TXDhrk3 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    echo "请确认："
    echo "1. MySQL 服务已启动"
    echo "2. 数据库用户名、密码正确"
    echo "3. 数据库 'duanshipin' 已创建"
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 2/6: 停止旧容器${NC}"
docker-compose down || true

echo ""
echo -e "${YELLOW}步骤 3/6: 构建 Docker 镜像${NC}"
docker-compose build --no-cache

echo ""
echo -e "${YELLOW}步骤 4/6: 启动服务${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}步骤 5/6: 等待服务启动${NC}"
echo "等待后端服务启动..."
sleep 10

# 检查后端服务
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec duanshipin-backend curl -f http://localhost:4000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务已启动${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo "等待中... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ 后端服务启动超时${NC}"
    echo "查看日志："
    docker-compose logs backend
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 6/6: 运行数据库迁移${NC}"
docker exec duanshipin-backend npx prisma migrate deploy || echo -e "${YELLOW}警告: 数据库迁移失败，如果是首次部署，请手动运行迁移${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}部署完成！${NC}"
echo "================================================"
echo ""
echo "服务访问地址："
echo "  前端: http://shipin.shapantutu:4001"
echo "  后端: http://shipin.shapantutu:4000"
echo "  API文档: http://shipin.shapantutu:4000/api-docs"
echo ""
echo "常用命令："
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  查看状态: docker-compose ps"
echo ""
echo "注意事项："
echo "1. 请在宝塔面板中配置域名反向代理到端口 4001"
echo "2. 首次部署需要创建管理员账号："
echo "   docker exec -it duanshipin-backend npm run create-admin"
echo "3. 如需查看后端日志："
echo "   docker-compose logs -f backend"
echo ""



