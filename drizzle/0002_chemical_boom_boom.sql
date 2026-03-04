CREATE TABLE `sent_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertKey` varchar(64) NOT NULL,
	`itemCount` int NOT NULL DEFAULT 1,
	`recipientCount` int NOT NULL DEFAULT 0,
	`summary` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sent_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sent_alerts_alertKey_unique` UNIQUE(`alertKey`)
);
