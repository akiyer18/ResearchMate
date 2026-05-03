ALTER TABLE `paper_summaries` ADD `content_type` text DEFAULT 'research_paper' NOT NULL;--> statement-breakpoint
ALTER TABLE `paper_summaries` ADD `scan_meta` text DEFAULT '{}' NOT NULL;
