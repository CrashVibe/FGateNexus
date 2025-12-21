CREATE TABLE `adapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_idx` ON `user_sessions` (`session_token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text,
	`salt` text,
	`two_factor_secret` text,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`ip` text,
	`social_account_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`social_account_id`) REFERENCES `social_accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uuid_idx` ON `players` (`uuid`);--> statement-breakpoint
CREATE TABLE `player_servers` (
	`player_id` integer NOT NULL,
	`server_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`player_id`, `server_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_player_servers_player` ON `player_servers` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_player_servers_server` ON `player_servers` (`server_id`);--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`version` text,
	`software` text,
	`adapter_id` integer,
	`binding_config` text NOT NULL,
	`chat_sync_config` text NOT NULL,
	`command_config` text NOT NULL,
	`notify_config` text NOT NULL,
	FOREIGN KEY (`adapter_id`) REFERENCES `adapters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `servers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `servers` (`token`);--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nickname` text,
	`uid` text NOT NULL,
	`adapter_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_social_uid_per_adapter` ON `social_accounts` (`adapter_type`,`uid`);--> statement-breakpoint
CREATE INDEX `idx_social_adapter` ON `social_accounts` (`adapter_type`);--> statement-breakpoint
CREATE TABLE `targets` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` integer NOT NULL,
	`target_id` text NOT NULL,
	`type` text DEFAULT 'group' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_target_in_server` ON `targets` (`server_id`,`target_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_targets_server` ON `targets` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_targets_group` ON `targets` (`target_id`);
