CREATE TABLE `spanish_buddy_exercise_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`item_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`payload` text NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
