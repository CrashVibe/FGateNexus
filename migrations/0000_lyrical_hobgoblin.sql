CREATE TABLE `adapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`software` text,
	`version` text,
	`adapter_id` integer,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `servers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `servers` (`token`);