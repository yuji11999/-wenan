#!/bin/bash
# 短视频文案系统 - 快速更新脚本
# 用于更新前端代码并确保浏览器缓存失效

set -e

cd /www/wwwroot/duanshipin

echo "========================================="
echo "短视频文案系统 - 快速更新"
echo "========================================="
echo ""

# 1. 添加时间戳注释，强制文件内容变化
echo "步骤 1/5: 添加构建标记..."
echo "" >> frontend/src/views/Settings.vue
echo "// Build: $(date +%Y%m%d%H%M%S)" >> frontend/src/views/Settings.vue

# 2. 停止前端
echo "步骤 2/5: 停止前端容器..."
docker-compose stop frontend > /dev/null 2>&1

# 3. 删除旧镜像
echo "步骤 3/5: 删除旧镜像..."
docker rmi duanshipin-frontend > /dev/null 2>&1 || true

# 4. 重新构建
echo "步骤 4/5: 重新构建前端..."
docker-compose build --no-cache frontend

# 5. 启动
echo "步骤 5/5: 启动前端..."
docker-compose up -d frontend

echo ""
echo "========================================="
echo "更新完成！"
echo "========================================="
echo ""
echo "新构建的文件："
docker exec duanshipin-frontend ls -lht /usr/share/nginx/html/assets/ 2>/dev/null | head -6
echo ""
echo "请在浏览器中："
echo "1. 按 Ctrl + Shift + R 强制刷新"
echo "2. 或关闭浏览器重新打开"
echo ""






