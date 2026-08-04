ALTER TABLE `spanish_buddy_topics` ADD `cefr_level` text DEFAULT 'A1' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `curriculum_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `prerequisite_keys` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `level_rationale` text DEFAULT '' NOT NULL;