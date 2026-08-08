CREATE TABLE `commit` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`v` integer NOT NULL,
	`message` text NOT NULL,
	`html` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_commit_project_id_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `project` ADD `live_commit_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `commit_project_id_v_idx` ON `commit` (`project_id`,`v`);--> statement-breakpoint
INSERT INTO `commit` (`id`, `project_id`, `v`, `message`, `html`, `created_at`)
SELECT lower(hex(randomblob(16))), `id`, 1, 'Initial version', `published_html`, coalesce(`published_at`, `created_at`)
FROM `project`
WHERE `published_html` IS NOT NULL;--> statement-breakpoint
UPDATE `project`
SET `live_commit_id` = (
	SELECT `c`.`id` FROM `commit` `c` WHERE `c`.`project_id` = `project`.`id` AND `c`.`v` = 1
)
WHERE `is_published` = 1;--> statement-breakpoint
ALTER TABLE `project` DROP COLUMN `is_published`;