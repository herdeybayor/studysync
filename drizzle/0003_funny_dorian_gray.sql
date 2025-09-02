CREATE TABLE `calendar_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`default_view` text DEFAULT 'month' NOT NULL,
	`week_starts_on` integer DEFAULT 0 NOT NULL,
	`working_hours_start` text DEFAULT '09:00' NOT NULL,
	`working_hours_end` text DEFAULT '17:00' NOT NULL,
	`default_event_duration` integer DEFAULT 60 NOT NULL,
	`show_week_numbers` integer DEFAULT false NOT NULL,
	`default_reminders` text,
	`time_format` text DEFAULT '12h' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer,
	`reminder_time` integer NOT NULL,
	`reminder_type` text NOT NULL,
	`is_triggered` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `is_all_day` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `category_id` integer REFERENCES event_categories(id);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `timezone` text DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `recurrence_rule` text;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `recurrence_parent_id` integer REFERENCES calendar_events(id);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `recurrence_date` integer;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `is_recurrence_exception` integer DEFAULT false NOT NULL;