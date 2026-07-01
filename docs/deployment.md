# Docker 部署文档

本文档说明如何使用 Docker 一键部署短视频文案系统。当前部署方式会同时启动前端、后端和 Docker MySQL。

## 环境要求

服务器需要安装：

- Git
- Docker
- Docker Compose

检查命令：

```bash
git --version
docker --version
docker compose version
```

如果服务器只有旧版 `docker-compose` 命令，`deploy.sh` 也会自动兼容。

## 首次部署

```bash
git clone https://gitee.com/fdf194410/short-video-script-studio.git
cd short-video-script-studio
chmod +x deploy.sh
./deploy.sh
```

脚本会自动执行：

1. 检查 Docker 和 Docker Compose。
2. 如果不存在 `.env`，自动生成数据库密码、JWT 密钥、API Key 加密密钥。
3. 构建并启动 MySQL、后端、前端容器。
4. 等待服务健康检查通过。
5. 自动创建初始管理员账号，并在终端打印初始密码。

部署完成后访问：

```text
http://服务器IP:4001
```

初始管理员密码只会在部署终端输出，请妥善保存，并在首次登录后立即修改。

## 服务端口

默认端口：

- 前端：`4001`
- 后端：`127.0.0.1:4000`
- MySQL：仅 Docker 内网访问，不暴露宿主机端口

后端默认只绑定本机地址，由前端 Nginx 在 Docker 网络内代理访问，这样可以减少后端接口直接暴露到公网的风险。

如需修改端口，编辑 `.env`：

```env
FRONTEND_PORT=4001
BACKEND_BIND_HOST=127.0.0.1
BACKEND_PORT=4000
```

修改后重新部署：

```bash
./deploy.sh
```

## 构建源配置

Dockerfile 默认使用基础镜像自带的 Debian/Alpine 软件源，不再强制替换为某个云厂商镜像，避免服务器无法解析特定镜像域名导致构建卡住。

如果 `npm ci` 下载依赖较慢，可以在 `.env` 中改成当前服务器可访问的 npm 源：

```env
NPM_REGISTRY=https://registry.npmjs.org/
```

例如网络环境更适合国内镜像时，可改为：

```env
NPM_REGISTRY=https://registry.npmmirror.com
```

修改后重新构建：

```bash
docker compose --env-file .env build --no-cache
docker compose --env-file .env up -d
```

## 更新部署

```bash
cd short-video-script-studio
git pull
./deploy.sh
```

`.env` 文件不会被 Git 管理，更新代码不会覆盖已有数据库密码和系统密钥。

## 常用命令

查看容器状态：

```bash
docker compose --env-file .env ps
```

查看日志：

```bash
docker compose --env-file .env logs -f
```

重启服务：

```bash
docker compose --env-file .env restart
```

停止服务：

```bash
docker compose --env-file .env down
```

停止服务并删除数据库数据卷：

```bash
docker compose --env-file .env down -v
```

注意：`down -v` 会删除 MySQL 数据卷，生产环境不要随意执行。

## 数据库初始化和迁移

MySQL 由 `docker-compose.yml` 中的 `mysql` 服务启动，数据保存在 Docker 命名数据卷中。

后端容器启动时会执行：

```bash
npx prisma migrate deploy
```

该命令会使用 `backend/prisma/migrations` 下的 Prisma migration 自动初始化或迁移数据库。

## 管理员账号

首次执行 `./deploy.sh` 时，脚本会自动生成强随机初始管理员密码，并执行：

```bash
docker exec \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=自动生成的强密码 \
  duanshipin-backend npm run create-admin
```

如需手动创建或重置管理员密码：

```bash
docker exec -it \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD='请替换为至少12位强密码' \
  duanshipin-backend npm run reset-admin
```

## 大模型 API 配置

大模型 API Key 不通过 `.env` 配置，也不写入 `docker-compose.yml`。

部署完成后，请使用管理员账号登录前端，在系统设置中配置并激活大模型 API。普通用户会统一使用管理员激活的配置。

## 数据备份

查看实际数据卷名称：

```bash
docker volume ls | grep mysql_data
```

备份数据库：

```bash
docker exec duanshipin-mysql mysqldump \
  -uroot \
  -p"$MYSQL_ROOT_PASSWORD" \
  "$MYSQL_DATABASE" > backup.sql
```

如果当前 shell 没有加载 `.env`，可先执行：

```bash
set -a
. ./.env
set +a
```

## 反向代理建议

如果使用宝塔、Nginx 或 CDN 绑定域名，只需要把域名反向代理到前端端口：

```text
http://127.0.0.1:4001
```

不要直接把 MySQL 暴露到公网。后端端口默认绑定 `127.0.0.1`，通常也不需要公网暴露。
