CREATE TABLE `paper_log` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`paper_summary_id` text NOT NULL,
	`paper_title` text NOT NULL,
	`date_reviewed` text NOT NULL,
	`source_type` text NOT NULL,
	`primary_topic` text DEFAULT '' NOT NULL,
	`keyword_snapshot` text DEFAULT '[]' NOT NULL,
	`user_note_preview` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`paper_summary_id`) REFERENCES `paper_summaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `paper_summaries` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`paper_title` text NOT NULL,
	`authors` text DEFAULT '' NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`extracted_text_excerpt` text,
	`executive_summary` text DEFAULT '' NOT NULL,
	`methodology_summary` text DEFAULT '' NOT NULL,
	`results_summary` text DEFAULT '' NOT NULL,
	`discussion_summary` text DEFAULT '' NOT NULL,
	`future_work_summary` text DEFAULT '' NOT NULL,
	`key_takeaways` text DEFAULT '[]' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`important_concepts` text DEFAULT '[]' NOT NULL,
	`user_notes` text DEFAULT '' NOT NULL,
	`reason_for_reading` text DEFAULT '' NOT NULL,
	`user_topic_tag` text DEFAULT '' NOT NULL,
	`processing_model` text DEFAULT '' NOT NULL,
	`processing_status` text DEFAULT 'completed' NOT NULL,
	`scan_confidence` text DEFAULT 'medium' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_usage_daily` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`provider_name` text NOT NULL,
	`usage_date` text NOT NULL,
	`requests_count` integer DEFAULT 0 NOT NULL,
	`estimated_tokens` integer DEFAULT 0 NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL
);
