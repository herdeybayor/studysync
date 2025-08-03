CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`is_lecture` integer DEFAULT false NOT NULL,
	`location` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `recordings` ADD `calendar_event_id` integer REFERENCES calendar_events(id);--> statement-breakpoint
ALTER TABLE `recordings` ADD `audio_file_path` text;--> statement-breakpoint
ALTER TABLE `recordings` ADD `duration` integer;--> statement-breakpoint
ALTER TABLE `recordings` ADD `file_size` integer;