import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const spanishBuddySyncProfiles = sqliteTable("spanish_buddy_sync_profiles", {
  ownerId: text("owner_id").primaryKey(),
  name: text("name").notNull().default("Mi biblioteca"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyLessons = sqliteTable("spanish_buddy_lessons", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  sourceType: text("source_type").notNull().default("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyItems = sqliteTable("spanish_buddy_items", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  kind: text("kind", { enum: ["vocabulary", "grammar"] }).notNull(),
  learningType: text("learning_type", { enum: ["word", "collocation", "fixed_expression", "sentence_pattern", "grammar_rule", "conjugation"] }).notNull().default("word"),
  spanish: text("spanish").notNull(),
  translation: text("translation").notNull().default(""),
  explanation: text("explanation").notNull().default(""),
  example: text("example").notNull().default(""),
  acceptedAnswers: text("accepted_answers").notNull().default("[]"),
  provenance: text("provenance", { enum: ["course", "suggested"] }).notNull().default("course"),
  mastery: integer("mastery").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  nextReviewAt: text("next_review_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyTopics = sqliteTable("spanish_buddy_topics", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  canonicalKey: text("canonical_key").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("sb_topics_owner_key_idx").on(table.ownerId, table.canonicalKey)]);

export const spanishBuddyItemTopics = sqliteTable("spanish_buddy_item_topics", {
  ownerId: text("owner_id").notNull(),
  itemId: text("item_id").notNull(),
  topicId: text("topic_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("sb_item_topics_unique_idx").on(table.ownerId, table.itemId, table.topicId)]);

export const spanishBuddyAttempts = sqliteTable("spanish_buddy_attempts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  itemId: text("item_id").notNull(),
  exerciseType: text("exercise_type").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  quality: text("quality", { enum: ["correct", "almost", "incorrect"] }).notNull().default("incorrect"),
  masteryBefore: integer("mastery_before").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyAnswerCache = sqliteTable("spanish_buddy_answer_cache", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  itemId: text("item_id").notNull().default(""),
  exerciseType: text("exercise_type").notNull(),
  promptNormalized: text("prompt_normalized").notNull(),
  expectedNormalized: text("expected_normalized").notNull(),
  learnerNormalized: text("learner_normalized").notNull(),
  verdict: text("verdict", { enum: ["exact", "equivalent", "learner_better", "almost", "incorrect"] }).notNull(),
  feedback: text("feedback").notNull().default(""),
  source: text("source", { enum: ["model", "learner"] }).notNull().default("model"),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyAiUsage = sqliteTable("spanish_buddy_ai_usage", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  operation: text("operation").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
  reasoningTokens: integer("reasoning_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyExerciseVariants = sqliteTable("spanish_buddy_exercise_variants", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  itemId: text("item_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  exerciseType: text("exercise_type").notNull(),
  payload: text("payload").notNull(),
  itemContentHash: text("item_content_hash").notNull().default(""),
  generatorVersion: text("generator_version").notNull().default("v1"),
  qualityStatus: text("quality_status", { enum: ["active", "retired", "reported"] }).notNull().default("active"),
  useCount: integer("use_count").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("sb_exercise_variants_owner_idx").on(table.ownerId, table.exerciseType, table.useCount),
  index("sb_exercise_variants_lesson_idx").on(table.lessonId),
]);

export const spanishBuddyPracticeSessions = sqliteTable("spanish_buddy_practice_sessions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  mode: text("mode").notNull().default("adaptive"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("sb_practice_sessions_owner_idx").on(table.ownerId, table.createdAt)]);

export const spanishBuddyVariantUsage = sqliteTable("spanish_buddy_variant_usage", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  sessionId: text("session_id").notNull(),
  variantId: text("variant_id").notNull(),
  itemId: text("item_id").notNull(),
  exerciseType: text("exercise_type").notNull(),
  shownAt: text("shown_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("sb_variant_usage_owner_idx").on(table.ownerId, table.shownAt),
  index("sb_variant_usage_variant_idx").on(table.variantId, table.shownAt),
]);
