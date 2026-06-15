CREATE TABLE `server_status_history` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mspt` real,
	`online` integer NOT NULL,
	`server_id` integer NOT NULL,
	`tps` real,
	FOREIGN KEY (`server_id`) REFERENCES `server`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_status_history_server_time` ON `server_status_history` (`server_id`,`created_at`);