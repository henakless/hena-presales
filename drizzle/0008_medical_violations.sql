CREATE INDEX IF NOT EXISTS `sb_exercise_variants_owner_idx` ON `spanish_buddy_exercise_variants` (`owner_id`,`exercise_type`,`use_count`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sb_exercise_variants_lesson_idx` ON `spanish_buddy_exercise_variants` (`lesson_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sb_practice_sessions_owner_idx` ON `spanish_buddy_practice_sessions` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sb_variant_usage_owner_idx` ON `spanish_buddy_variant_usage` (`owner_id`,`shown_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sb_variant_usage_variant_idx` ON `spanish_buddy_variant_usage` (`variant_id`,`shown_at`);
