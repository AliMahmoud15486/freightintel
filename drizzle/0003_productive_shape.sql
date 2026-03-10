CREATE TABLE `freight_lanes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`originRegion` varchar(64) NOT NULL,
	`destinationRegion` varchar(64) NOT NULL,
	`originPort` varchar(128) NOT NULL,
	`destinationPort` varchar(128) NOT NULL,
	`baseTransitDays` int NOT NULL,
	`costIndex` int NOT NULL DEFAULT 2,
	`zones` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `freight_lanes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lane_carriers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laneId` int NOT NULL,
	`carrierId` varchar(64) NOT NULL,
	`carrierName` varchar(128) NOT NULL,
	`transitDays` int NOT NULL,
	`reliabilityScore` int NOT NULL DEFAULT 70,
	`costIndex` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lane_carriers_id` PRIMARY KEY(`id`)
);
