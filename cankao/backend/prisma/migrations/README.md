# 数据库迁移说明

## 添加素材管理字段

### 执行SQL迁移

由于数据库用户权限限制，需要手动执行SQL迁移。请使用具有CREATE权限的数据库用户执行以下SQL：

```sql
-- 添加素材相关字段
ALTER TABLE `copywritings` 
ADD COLUMN `isSystemMaterial` BOOLEAN NOT NULL DEFAULT false COMMENT '是否为系统素材',
ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false COMMENT '是否公开分享',
ADD COLUMN `viewCount` INT NOT NULL DEFAULT 0 COMMENT '浏览次数';

-- 创建索引以提升查询性能
CREATE INDEX `copywritings_isSystemMaterial_idx` ON `copywritings`(`isSystemMaterial`);
CREATE INDEX `copywritings_isPublic_idx` ON `copywritings`(`isPublic`);
```

### 字段说明

1. **isSystemMaterial** (布尔型，默认false)
   - 标识是否为系统预设素材
   - 系统素材由管理员创建，标记为优质示例
   - 在前端显示🌟系统素材标识

2. **isPublic** (布尔型，默认false)
   - 标识是否为用户公开分享的素材
   - 用户可以将自己的火爆文案分享给其他用户
   - 在前端显示🔓公开素材标识

3. **viewCount** (整型，默认0)
   - 记录文案被查看的次数
   - 可用于统计热门文案

### 执行后验证

迁移完成后，可以执行以下SQL验证：

```sql
SHOW COLUMNS FROM `copywritings`;
SHOW INDEX FROM `copywritings`;
```

确保看到新增的三个字段和两个索引。




