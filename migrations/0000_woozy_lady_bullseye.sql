CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`software` text,
	`version` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `servers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `servers` (`token`);