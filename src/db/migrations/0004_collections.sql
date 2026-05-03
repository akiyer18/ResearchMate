CREATE TABLE `collections` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`project_id` text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	`name` text NOT NULL,
	`color` text DEFAULT 'none' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint

CREATE INDEX `collections_project_id_idx` ON `collections` (`project_id`);--> statement-breakpoint

CREATE TABLE `paper_collections` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`paper_id` text NOT NULL REFERENCES paper_summaries(id) ON DELETE CASCADE,
	`collection_id` text NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX `paper_collections_paper_collection` ON `paper_collections` (`user_id`,`paper_id`,`collection_id`);--> statement-breakpoint
CREATE INDEX `paper_collections_paper_id_idx` ON `paper_collections` (`paper_id`);--> statement-breakpoint
CREATE INDEX `paper_collections_collection_id_idx` ON `paper_collections` (`collection_id`);

