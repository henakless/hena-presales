CREATE TABLE `spanish_buddy_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`item_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`correct` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spanish_buddy_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`kind` text NOT NULL,
	`spanish` text NOT NULL,
	`translation` text DEFAULT '' NOT NULL,
	`explanation` text DEFAULT '' NOT NULL,
	`example` text DEFAULT '' NOT NULL,
	`provenance` text DEFAULT 'course' NOT NULL,
	`mastery` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`next_review_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spanish_buddy_lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`source_type` text DEFAULT 'notes' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
