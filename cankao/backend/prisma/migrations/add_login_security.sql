-- 添加用户表的安全字段
ALTER TABLE `users` ADD COLUMN `loginAttempts` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `lockedUntil` DATETIME(3) NULL;
ALTER TABLE `users` ADD COLUMN `lastLoginAt` DATETIME(3) NULL;
ALTER TABLE `users` ADD COLUMN `lastLoginIp` VARCHAR(191) NULL;

-- 创建登录日志表
CREATE TABLE `login_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `success` BOOLEAN NOT NULL,
    `failReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_logs_userId_idx`(`userId`),
    INDEX `login_logs_username_idx`(`username`),
    INDEX `login_logs_ipAddress_idx`(`ipAddress`),
    INDEX `login_logs_success_idx`(`success`),
    INDEX `login_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户会话表
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsed` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_token_key`(`token`),
    INDEX `user_sessions_userId_idx`(`userId`),
    INDEX `user_sessions_isActive_idx`(`isActive`),
    INDEX `user_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 添加外键约束
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
