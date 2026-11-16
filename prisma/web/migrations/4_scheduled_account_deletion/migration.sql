CREATE TABLE `accountDeletionSchedule` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `deleteAccount` BOOLEAN NOT NULL,
    `deleteBot` BOOLEAN NOT NULL,
    `deleteOsuGuessr` BOOLEAN NOT NULL,
    `discordId` VARCHAR(255) NULL,
    `osuId` VARCHAR(255) NULL,
    `requestedAt` TIMESTAMP(3) NOT NULL,
    `purgeAfter` TIMESTAMP(3) NOT NULL,
    `lastAttemptAt` TIMESTAMP(3) NULL,
    `lastError` VARCHAR(64) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `accountDeletionSchedule_user_unique` (`userId`),
    KEY `accountDeletionSchedule_purge_idx` (`purgeAfter`),
    CONSTRAINT `accountDeletionSchedule_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
