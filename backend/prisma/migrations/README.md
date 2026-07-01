# 数据库迁移说明

## Docker 一键部署

Docker 部署使用 Prisma 标准迁移目录：

- `20260701000000_init/migration.sql`：从当前 `schema.prisma` 生成的初始化迁移，用于空 MySQL 数据库首次部署。
- 后端容器启动脚本会执行 `npx prisma migrate deploy`，自动创建/更新数据库结构。

旧的独立 SQL 文件仅保留作历史说明；新增结构变更应通过新的 Prisma migration 子目录提交，不再依赖手动执行散落 SQL。

## 登录安全功能迁移 (add_login_security.sql)

此迁移添加了登录安全相关的功能，包括：

### 新增功能
1. **登录失败锁定** - 连续5次登录失败后锁定账号30分钟
2. **登录日志记录** - 记录所有登录尝试（成功/失败）
3. **会话管理** - 管理员可以查看和强制登出用户会话
4. **IP和设备记录** - 记录最后登录IP和设备信息

### 数据库变更

#### User 表新增字段：
- `loginAttempts` - 登录失败次数
- `lockedUntil` - 账号锁定到期时间
- `lastLoginAt` - 最后登录时间
- `lastLoginIp` - 最后登录IP

#### 新增表：
- `login_logs` - 登录日志表
- `user_sessions` - 用户会话表

### 执行迁移

1. **备份数据库**（重要！）
   ```bash
   mysqldump -u root -p your_database > backup_before_login_security.sql
   ```

2. **执行迁移脚本**
   ```bash
   mysql -u root -p your_database < add_login_security.sql
   ```

3. **生成 Prisma Client**
   ```bash
   cd backend
   npx prisma generate
   ```

4. **重启后端服务**
   ```bash
   npm run start:dev
   ```

### 注意事项

- 迁移会为现有用户设置默认值（loginAttempts=0, lockedUntil=null等）
- 迁移后需要重新生成 Prisma Client
- 建议先在测试环境执行迁移
- 确保数据库用户有创建表和修改表结构的权限

### 回滚方案

如果需要回滚，可以执行以下SQL：

```sql
-- 删除新表
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `login_logs`;

-- 删除User表的新字段
ALTER TABLE `users` DROP COLUMN `loginAttempts`;
ALTER TABLE `users` DROP COLUMN `lockedUntil`;
ALTER TABLE `users` DROP COLUMN `lastLoginAt`;
ALTER TABLE `users` DROP COLUMN `lastLoginIp`;
```
