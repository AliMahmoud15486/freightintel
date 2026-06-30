CREATE INDEX `freight_lanes_region_idx` ON `freight_lanes` (`originRegion`,`destinationRegion`);--> statement-breakpoint
CREATE INDEX `lane_carriers_lane_idx` ON `lane_carriers` (`laneId`);--> statement-breakpoint
CREATE INDEX `margin_history_user_month_idx` ON `margin_history` (`userId`,`month`);--> statement-breakpoint
CREATE INDEX `risk_forecasts_lane_generated_idx` ON `risk_forecasts` (`laneId`,`generatedAt`);