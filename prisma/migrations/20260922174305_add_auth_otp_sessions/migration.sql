-- CreateTable
CREATE TABLE `otp_challenges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(15) NOT NULL,
    `code_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `otp_challenges_phone_created_at_idx`(`phone`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_seen_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `customer_sessions_token_hash_key`(`token_hash`),
    INDEX `customer_sessions_customer_id_idx`(`customer_id`),
    INDEX `customer_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
