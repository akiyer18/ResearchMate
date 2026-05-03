ALTER TABLE `paper_summaries` ADD `research_facets` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `structured_notes` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `last_opened_at` integer;--> statement-breakpoint
ALTER TABLE `project_notes` ADD `paper_summary_id` text REFERENCES paper_summaries(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE TABLE `recent_activity` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`label` text NOT NULL,
	`href` text NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`last_active_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `recent_activity_user_kind_entity` ON `recent_activity` (`user_id`,`kind`,`entity_id`);--> statement-breakpoint
CREATE TABLE `project_writing` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`project_id` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`lit_review_draft` text DEFAULT '' NOT NULL,
	`lit_review_generated_at` integer,
	`lit_review_source_hash` text DEFAULT '' NOT NULL,
	`citation_style` text DEFAULT 'apa-lite' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `project_writing_project_id_unique` ON `project_writing` (`project_id`);
