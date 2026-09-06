-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER UNSIGNED NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `categories_parent_id_idx`(`parent_id`),
    UNIQUE INDEX `categories_parent_slug_key`(`parent_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(512) NOT NULL,
    `category_id` INTEGER UNSIGNED NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `image` VARCHAR(1024) NULL,
    `item_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
