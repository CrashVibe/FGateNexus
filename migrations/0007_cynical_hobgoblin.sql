DROP INDEX `idx_player_server_player`;--> statement-breakpoint
DROP INDEX `idx_social_platform`;--> statement-breakpoint
DROP INDEX `idx_target_server`;--> statement-breakpoint
CREATE INDEX `idx_player_social` ON `player` (`social_account_id`);--> statement-breakpoint
CREATE INDEX `idx_event_time` ON `player_event` (`created_at`);