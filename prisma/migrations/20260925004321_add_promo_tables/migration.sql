-- CreateTable
CREATE TABLE `promo_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `discount_percent_old` INTEGER NULL,
    `discount_type` ENUM('percent', 'fixed') NULL DEFAULT 'percent',
    `discount_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `usage_type` ENUM('one_time', 'multi') NULL DEFAULT 'one_time',
    `order_limit` ENUM('first_only', 'any') NULL DEFAULT 'first_only',
    `expiry_date` DATE NULL,
    `max_uses` INTEGER NULL DEFAULT 0,
    `max_uses_per_user` INTEGER NULL DEFAULT 0,
    `times_used` INTEGER NULL DEFAULT 0,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `promo_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promo_usage_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promo_code` VARCHAR(50) NOT NULL,
    `user_id` VARCHAR(50) NOT NULL,
    `order_id` BIGINT NULL,
    `used_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `promo_usage_history_promo_code_idx`(`promo_code`),
    INDEX `promo_usage_history_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `used_promocodes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(50) NOT NULL,
    `promo_code` VARCHAR(50) NOT NULL,
    `used_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `used_promocodes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
