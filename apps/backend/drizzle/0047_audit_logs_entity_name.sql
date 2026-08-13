-- Fitur: Audit log — kolom entity_name untuk nama entitas yang dapat dibaca manusia.
-- All statements are idempotent / guarded so they are safe to run repeatedly.

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_name" varchar(255);
