CREATE TABLE `spanish_buddy_practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`mode` text DEFAULT 'adaptive' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spanish_buddy_variant_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`session_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`item_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`shown_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `spanish_buddy_exercise_variants` ADD `item_content_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_exercise_variants` ADD `generator_version` text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_exercise_variants` ADD `quality_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_exercise_variants` ADD `last_used_at` text;