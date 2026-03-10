CREATE TABLE `risk_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laneId` int NOT NULL,
	`laneName` varchar(255) NOT NULL,
	`probability30d` int NOT NULL,
	`probability60d` int NOT NULL,
	`trend` enum('rising','stable','falling') NOT NULL DEFAULT 'stable',
	`keyRisks` text,
	`confidence` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`summary` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_forecasts_id` PRIMARY KEY(`id`)
);
