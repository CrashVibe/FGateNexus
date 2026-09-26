CREATE TABLE `template_instance` (
	`binding` text,
	`config` text NOT NULL,
	`created_at` integer NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`server_id` integer NOT NULL,
	`template_id` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `server`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_template_per_server` ON `template_instance` (`server_id`,`template_id`);