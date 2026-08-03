import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  spanish: text("spanish").notNull(),
  translation: text("translation").notNull().default(""),
  explanation: text("explanation").notNull().default(""),
  example: text("example").notNull().default(""),
  provenance: text("provenance", { enum: ["course", "suggested"] }).notNull().default("course"),
  mastery: integer("mastery").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  nextReviewAt: text("next_review_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const spanishBuddyAttempts = sqliteTable("spanish_buddy_attempts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  itemId: text("item_id").notNull(),
  exerciseType: text("exercise_type").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
