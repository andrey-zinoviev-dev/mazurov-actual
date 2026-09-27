-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_number` INTEGER NOT NULL,
    `user_id` VARCHAR(50) NOT NULL,
    `user_name` VARCHAR(255) NULL,
    `client_name` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `dates` VARCHAR(100) NULL,
    `days` INTEGER NULL DEFAULT 1,
    `total` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NULL,
    `status` VARCHAR(50) NULL DEFAULT 'PENDING',
    `status_code` VARCHAR(50) NULL DEFAULT 'PENDING',
    `hidden` BOOLEAN NULL DEFAULT false,
    `delivery_method` VARCHAR(20) NULL DEFAULT 'pickup',
    `delivery_address` TEXT NULL,
    `promo_code` VARCHAR(50) NULL,
    `promo_discount_percent` INTEGER NULL,
    `promo_discount_amount` DECIMAL(10, 2) NULL,
    `promo_rejected` BOOLEAN NULL DEFAULT false,
    `promo_reject_reason` TEXT NULL,
    `raw_data` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `orders_order_number_idx`(`order_number`),
    INDEX `orders_user_id_idx`(`user_id`),
    INDEX `orders_status_code_idx`(`status_code`),
    INDEX `orders_hidden_idx`(`hidden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `product_id` INTEGER NOT NULL,
    `product_name` VARCHAR(500) NOT NULL,
    `category` VARCHAR(100) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price_per_day` DECIMAL(10, 2) NOT NULL,
    `days_count` INTEGER NULL DEFAULT 1,
    `total_price` DECIMAL(10, 2) NOT NULL,

    INDEX `order_items_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_counter` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `last_number` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `status` VARCHAR(100) NOT NULL,
    `comment` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `order_status_history_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Seed single-row order number generator (same as hosting)
INSERT INTO `order_counter` (`id`, `last_number`) VALUES (1, 0);
