CREATE TABLE `spanish_buddy_ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`operation` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spanish_buddy_answer_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`item_id` text DEFAULT '' NOT NULL,
	`exercise_type` text NOT NULL,
	`prompt_normalized` text NOT NULL,
	`expected_normalized` text NOT NULL,
	`learner_normalized` text NOT NULL,
	`verdict` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'model' NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `spanish_buddy_items` ADD `accepted_answers` text DEFAULT '[]' NOT NULL;