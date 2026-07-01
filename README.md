# 短视频文案系统

## Docker 一键部署

服务器需要先安装 Git、Docker 和 Docker Compose。部署命令：

```bash
git clone https://gitee.com/fdf194410/short-video-script-studio.git
cd short-video-script-studio
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动完成：

- 生成 `.env` 部署密钥配置
- 启动 Docker MySQL
- 构建并启动后端服务
- 构建并启动前端 Nginx
- 自动执行数据库迁移
- 自动创建初始管理员账号

部署完成后访问：

```text
http://服务器IP:4001
```

终端会打印初始管理员用户名和密码，请首次登录后立即修改密码。

更多部署、更新、备份说明见 [Docker 部署文档](docs/deployment.md)。

如果服务器构建很慢，可以在本地或 CI 先构建并推送镜像，再在服务器执行 `deploy-prebuilt.sh` 直接拉取镜像部署，见 [预构建镜像部署](docs/deployment.md#预构建镜像部署)。

## 大模型 API 配置

大模型 API Key 不写入服务器环境变量。请使用管理员账号登录系统，在前端系统设置中配置并激活大模型 API，其他用户会统一使用管理员配置。
