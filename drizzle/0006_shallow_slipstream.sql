CREATE TABLE `spanish_buddy_item_topics` (
	`owner_id` text NOT NULL,
	`item_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sb_item_topics_unique_idx` ON `spanish_buddy_item_topics` (`owner_id`,`item_id`,`topic_id`);--> statement-breakpoint
CREATE TABLE `spanish_buddy_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`canonical_key` text NOT NULL,
	`title` text NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sb_topics_owner_key_idx` ON `spanish_buddy_topics` (`owner_id`,`canonical_key`);