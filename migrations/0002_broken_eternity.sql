ALTER TABLE `adapters` RENAME TO `bot`;--> statement-breakpoint
ALTER TABLE `users` RENAME TO `user`;--> statement-breakpoint
ALTER TABLE `players` RENAME TO `player`;--> statement-breakpoint
ALTER TABLE `player_servers` RENAME TO `player_server`;--> statement-breakpoint
ALTER TABLE `servers` RENAME TO `server`;--> statement-breakpoint
ALTER TABLE `social_accounts` RENAME TO `social_account`;--> statement-breakpoint
ALTER TABLE `targets` RENAME TO `target`;--> statement-breakpoint
ALTER TABLE `bot` RENAME COLUMN "type" TO "platform";--> statement-breakpoint
ALTER TABLE `server` RENAME COLUMN "adapter_id" TO "bot_id";--> statement-breakpoint
ALTER TABLE `social_account` RENAME COLUMN "adapter_type" TO "platform";--> statement-breakpoint
ALTER TABLE `target` RENAME COLUMN "target_id" TO "channel_id";--> statement-breakpoint
DROP TABLE `user_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_player` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text,
	`name` text NOT NULL,
	`social_account_id` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`uuid` text NOT NULL,
	FOREIGN KEY (`social_account_id`) REFERENCES `social_account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_player`("created_at", "id", "ip", "name", "social_account_id", "updated_at", "uuid") SELECT "created_at", "id", "ip", "name", "social_account_id", "updated_at", "uuid" FROM `player`;--> statement-breakpoint
DROP TABLE `player`;--> statement-breakpoint
ALTER TABLE `__new_player` RENAME TO `player`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uuid_idx` ON `player` (`uuid`);--> statement-breakpoint
CREATE TABLE `__new_player_server` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`player_id` integer NOT NULL,
	`server_id` integer NOT NULL,
	PRIMARY KEY(`player_id`, `server_id`),
	FOREIGN KEY (`player_id`) REFERENCES `player`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `server`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_player_server`("created_at", "player_id", "server_id") SELECT "created_at", "player_id", "server_id" FROM `player_server`;--> statement-breakpoint
DROP TABLE `player_server`;--> statement-breakpoint
ALTER TABLE `__new_player_server` RENAME TO `player_server`;--> statement-breakpoint
CREATE INDEX `idx_player_server_player` ON `player_server` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_player_server_server` ON `player_server` (`server_id`);--> statement-breakpoint
CREATE TABLE `__new_server` (
	`binding_config` text NOT NULL,
	`bot_id` integer,
	`chat_sync_config` text NOT NULL,
	`command_config` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`software` text,
	`version` text,
	`name` text NOT NULL,
	`notify_config` text NOT NULL,
	`token` text NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `bot`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_server`("binding_config", "bot_id", "chat_sync_config", "command_config", "id", "software", "version", "name", "notify_config", "token") SELECT "binding_config", "bot_id", "chat_sync_config", "command_config", "id", "software", "version", "name", "notify_config", "token" FROM `server`;--> statement-breakpoint
DROP TABLE `server`;--> statement-breakpoint
ALTER TABLE `__new_server` RENAME TO `server`;--> statement-breakpoint
CREATE UNIQUE INDEX `name_idx` ON `server` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_idx` ON `server` (`token`);--> statement-breakpoint
DROP INDEX `uniq_social_uid_per_adapter`;--> statement-breakpoint
DROP INDEX `idx_social_adapter`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_social_uid_per_platform` ON `social_account` (`platform`,`uid`);--> statement-breakpoint
CREATE INDEX `idx_social_platform` ON `social_account` (`platform`);--> statement-breakpoint
CREATE TABLE `__new_target` (
	`channel_id` text NOT NULL,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`guild_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`server_id` integer NOT NULL,
	`type` text DEFAULT 'group' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `server`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_target`("channel_id", "config", "created_at", "enabled", "guild_id", "id", "platform", "server_id", "type", "updated_at") SELECT "channel_id", "config", "created_at", "enabled", "guild_id", "id", "platform", "server_id", "type", "updated_at" FROM `target`;--> statement-breakpoint
DROP TABLE `target`;--> statement-breakpoint
ALTER TABLE `__new_target` RENAME TO `target`;--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_target_in_server` ON `target` (`server_id`,`channel_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_target_server` ON `target` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_target_group` ON `target` (`channel_id`);