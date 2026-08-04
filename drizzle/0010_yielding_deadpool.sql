ALTER TABLE `spanish_buddy_topics` ADD `summary` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `definition` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `use_cases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `formation` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `examples` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `common_mistakes` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `quick_check` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_topics` ADD `content_version` text DEFAULT 'v1' NOT NULL;