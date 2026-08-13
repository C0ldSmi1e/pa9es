ALTER TABLE `user` ADD `referred_by` text REFERENCES user(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `user_referred_by_idx` ON `user` (`referred_by`);