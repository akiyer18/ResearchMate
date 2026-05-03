CREATE TABLE `project_activity` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`project_id` text NOT NULL,
	`activity_type` text NOT NULL,
	`entity_id` text,
	`title` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_insights` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`project_id` text NOT NULL,
	`paper_summary_id` text NOT NULL,
	`relevance_explanation` text DEFAULT '' NOT NULL,
	`project_fit_summary` text DEFAULT '' NOT NULL,
	`fit_area` text DEFAULT '' NOT NULL,
	`thesis_usefulness` text DEFAULT '' NOT NULL,
	`methodology_usefulness` text DEFAULT '' NOT NULL,
	`implementation_usefulness` text DEFAULT '' NOT NULL,
	`literature_review_usefulness` text DEFAULT '' NOT NULL,
	`discussion_usefulness` text DEFAULT '' NOT NULL,
	`future_work_usefulness` text DEFAULT '' NOT NULL,
	`related_project_papers` text DEFAULT '[]' NOT NULL,
	`improvement_suggestions` text DEFAULT '[]' NOT NULL,
	`gaps_identified` text DEFAULT '[]' NOT NULL,
	`contradictions_or_risks` text DEFAULT '[]' NOT NULL,
	`recommended_actions` text DEFAULT '[]' NOT NULL,
	`recommended_thesis_sections` text DEFAULT '[]' NOT NULL,
	`priority_level` text DEFAULT 'optional' NOT NULL,
	`confidence_notes` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paper_summary_id`) REFERENCES `paper_summaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`note_type` text DEFAULT 'note' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`project_type` text DEFAULT 'thesis' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`objective` text DEFAULT '' NOT NULL,
	`thesis_direction` text DEFAULT '' NOT NULL,
	`research_problem` text DEFAULT '' NOT NULL,
	`research_questions` text DEFAULT '[]' NOT NULL,
	`hypothesis` text,
	`methodology_direction` text DEFAULT '' NOT NULL,
	`implementation_goal` text DEFAULT '' NOT NULL,
	`target_outcome` text DEFAULT '' NOT NULL,
	`deadline` text,
	`primary_topics` text DEFAULT '[]' NOT NULL,
	`preferred_methods` text DEFAULT '[]' NOT NULL,
	`preferred_datasets` text DEFAULT '[]' NOT NULL,
	`preferred_metrics` text DEFAULT '[]' NOT NULL,
	`notes_summary` text DEFAULT '' NOT NULL,
	`accent` text DEFAULT 'indigo' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `paper_log` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `reading_intent` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `output_depth` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `project_relevance_score` integer;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `project_fit_area` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `thesis_section_fit` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `paper_role` text DEFAULT 'exploratory' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `implementation_relevance` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `literature_review_relevance` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `action_recommendation` text DEFAULT '' NOT NULL;