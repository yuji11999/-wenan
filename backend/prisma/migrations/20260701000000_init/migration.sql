-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copywritings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `videoUrl` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `sourceType` VARCHAR(191) NOT NULL DEFAULT 'original',
    `sourceId` VARCHAR(191) NULL,
    `isSystemMaterial` BOOLEAN NOT NULL DEFAULT false,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `shareStatus` VARCHAR(191) NOT NULL DEFAULT 'none',
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `copywritings_userId_idx`(`userId`),
    INDEX `copywritings_sourceType_idx`(`sourceType`),
    INDEX `copywritings_industry_idx`(`industry`),
    INDEX `copywritings_isSystemMaterial_idx`(`isSystemMaterial`),
    INDEX `copywritings_isPublic_idx`(`isPublic`),
    INDEX `copywritings_shareStatus_idx`(`shareStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copywriting_analyses` (
    `id` VARCHAR(191) NOT NULL,
    `copywritingId` VARCHAR(191) NOT NULL,
    `originalText` TEXT NOT NULL,
    `topic` VARCHAR(191) NOT NULL,
    `topicPosition` JSON NULL,
    `hook` VARCHAR(191) NOT NULL,
    `hookPosition` JSON NULL,
    `goldenSentence` VARCHAR(191) NOT NULL,
    `goldenPosition` JSON NULL,
    `adPlacement` VARCHAR(191) NOT NULL,
    `adPosition` JSON NULL,
    `analysisContent` TEXT NOT NULL,
    `contentPosition` JSON NULL,
    `tags` JSON NOT NULL,
    `industry` VARCHAR(191) NOT NULL,
    `aiConfidence` JSON NULL,
    `isModified` BOOLEAN NOT NULL DEFAULT false,
    `modifiedFields` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `copywriting_analyses_copywritingId_key`(`copywritingId`),
    INDEX `copywriting_analyses_copywritingId_idx`(`copywritingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copywriting_relations` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NOT NULL,
    `childId` VARCHAR(191) NOT NULL,
    `relationType` VARCHAR(191) NOT NULL,
    `rewriteStrategy` VARCHAR(191) NULL,
    `revisionType` VARCHAR(191) NULL,
    `isExternalRef` BOOLEAN NOT NULL DEFAULT false,
    `externalRefText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `copywriting_relations_parentId_idx`(`parentId`),
    INDEX `copywriting_relations_childId_idx`(`childId`),
    INDEX `copywriting_relations_relationType_idx`(`relationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `viral_analyses` (
    `id` VARCHAR(191) NOT NULL,
    `copywritingId` VARCHAR(191) NOT NULL,
    `overallScore` INTEGER NOT NULL,
    `topicHeat` INTEGER NOT NULL,
    `hookStrength` INTEGER NOT NULL,
    `emotionResonance` INTEGER NOT NULL,
    `spreadPotential` INTEGER NOT NULL,
    `conversionPower` INTEGER NOT NULL,
    `fireReasons` JSON NOT NULL,
    `improvementSuggestions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `viral_analyses_copywritingId_key`(`copywritingId`),
    INDEX `viral_analyses_overallScore_idx`(`overallScore`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `heatScore` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `materials_type_idx`(`type`),
    INDEX `materials_heatScore_idx`(`heatScore`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trendings` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `rank` INTEGER NOT NULL,
    `industry` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trendings_type_idx`(`type`),
    INDEX `trendings_industry_idx`(`industry`),
    INDEX `trendings_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_value_key`(`value`),
    INDEX `categories_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    INDEX `settings_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_configs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `apiKey` TEXT NOT NULL,
    `baseUrl` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ai_configs_userId_idx`(`userId`),
    INDEX `ai_configs_provider_idx`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
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

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsed` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_token_key`(`token`),
    INDEX `user_sessions_userId_idx`(`userId`),
    INDEX `user_sessions_token_idx`(`token`),
    INDEX `user_sessions_isActive_idx`(`isActive`),
    INDEX `user_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `copywritings` ADD CONSTRAINT `copywritings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_analyses` ADD CONSTRAINT `copywriting_analyses_copywritingId_fkey` FOREIGN KEY (`copywritingId`) REFERENCES `copywritings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_relations` ADD CONSTRAINT `copywriting_relations_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `copywritings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_relations` ADD CONSTRAINT `copywriting_relations_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `copywritings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_configs` ADD CONSTRAINT `ai_configs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
