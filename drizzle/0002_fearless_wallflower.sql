ALTER TABLE `spanish_buddy_attempts` ADD `quality` text DEFAULT 'incorrect' NOT NULL;--> statement-breakpoint
ALTER TABLE `spanish_buddy_attempts` ADD `mastery_before` integer DEFAULT 0 NOT NULL;