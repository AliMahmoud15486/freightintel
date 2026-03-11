CREATE TABLE `margin_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`avgMargin` float NOT NULL,
	`bestMargin` float,
	`worstMargin` float,
	`avgBrentPrice` float,
	`criticalSkuCount` int DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `margin_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchant_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255),
	`industry` varchar(128),
	`companySize` varchar(64),
	`annualImportVolume` varchar(64),
	`sourcingRegions` text,
	`productCategories` text,
	`website` varchar(512),
	`bio` text,
	`marginTargets` text,
	`carrierPrefs` text,
	`notificationPrefs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchant_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchant_profiles_userId_unique` UNIQUE(`userId`)
);
