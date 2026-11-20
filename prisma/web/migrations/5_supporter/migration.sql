CREATE TABLE `supporterLink` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `providerUserId` VARCHAR(64) NOT NULL,
    `displayName` VARCHAR(255) NULL,
    `linkedAt` TIMESTAMP(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `supporterLink_provider_unique` (`provider`, `providerUserId`),
    UNIQUE KEY `supporterLink_user_provider_unique` (`userId`, `provider`),
    CONSTRAINT `supporterLink_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `supporterMembership` (
    `id` VARCHAR(36) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `providerUserId` VARCHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL,
    `updatedAt` TIMESTAMP(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `supporterMembership_provider_unique` (`provider`, `providerUserId`)
) ENGINE=InnoDB;

CREATE TABLE `supporterPayment` (
    `id` VARCHAR(36) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `externalId` VARCHAR(128) NOT NULL,
    `providerUserId` VARCHAR(64) NOT NULL,
    `amountCents` INT NOT NULL,
    `days` INT NOT NULL,
    `receivedAt` TIMESTAMP(3) NOT NULL,
    `refundedAt` TIMESTAMP(3) NULL,
    `creditedUserId` VARCHAR(36) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `supporterPayment_external_unique` (`provider`, `externalId`),
    KEY `supporterPayment_provider_user_idx` (`provider`, `providerUserId`),
    KEY `supporterPayment_credited_user_idx` (`creditedUserId`),
    CONSTRAINT `supporterPayment_user_fk` FOREIGN KEY (`creditedUserId`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `supporterStatus` (
    `userId` VARCHAR(36) NOT NULL,
    `badgeSince` TIMESTAMP(3) NULL,
    `bankedSeconds` INT NOT NULL DEFAULT 0,
    `bankUpdatedAt` TIMESTAMP(3) NOT NULL,
    `membershipActive` BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (`userId`),
    CONSTRAINT `supporterStatus_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `supporterClaimCode` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `createdAt` TIMESTAMP(3) NOT NULL,
    `expiresAt` TIMESTAMP(3) NOT NULL,
    `consumedAt` TIMESTAMP(3) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `supporterClaimCode_hash_unique` (`codeHash`),
    KEY `supporterClaimCode_user_idx` (`userId`),
    CONSTRAINT `supporterClaimCode_user_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
