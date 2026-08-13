CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`delta` integer NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text,
	`note` text,
	`project_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_credit_ledger_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `user` ADD `credit_balance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `credit_ledger_user_id_idx` ON `credit_ledger` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_ledger_kind_ref_id_idx` ON `credit_ledger` (`kind`,`ref_id`);--> statement-breakpoint
INSERT INTO `credit_ledger` (`id`, `user_id`, `delta`, `kind`, `ref_id`, `note`)
SELECT lower(hex(randomblob(16))), `id`, 300, 'signup_bonus', `id`, 'backfill'
FROM `user`;--> statement-breakpoint
UPDATE `user` SET `credit_balance` = `credit_balance` + 300;