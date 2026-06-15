CREATE TABLE `player_event` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`data` text,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_name` text,
	`player_uuid` text,
	`server_id` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `server`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_event_server_type_time` ON `player_event` (`server_id`,`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_event_server_player_time` ON `player_event` (`server_id`,`player_uuid`,`created_at`);