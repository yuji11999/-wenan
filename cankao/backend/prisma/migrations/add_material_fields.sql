-- 添加素材相关字段
ALTER TABLE `copywritings` 
ADD COLUMN `isSystemMaterial` BOOLEAN NOT NULL DEFAULT false COMMENT '是否为系统素材',
ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false COMMENT '是否公开',
ADD COLUMN `shareStatus` VARCHAR(20) NOT NULL DEFAULT 'none' COMMENT '分享状态: none/pending/approved/rejected',
ADD COLUMN `viewCount` INT NOT NULL DEFAULT 0 COMMENT '浏览次数';

-- 创建索引
CREATE INDEX `copywritings_isSystemMaterial_idx` ON `copywritings`(`isSystemMaterial`);
CREATE INDEX `copywritings_isPublic_idx` ON `copywritings`(`isPublic`);
CREATE INDEX `copywritings_shareStatus_idx` ON `copywritings`(`shareStatus`);

