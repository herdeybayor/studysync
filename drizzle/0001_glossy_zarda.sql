CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`first_name` text,
	`last_name` text,
	`username` text,
	`preferences` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
