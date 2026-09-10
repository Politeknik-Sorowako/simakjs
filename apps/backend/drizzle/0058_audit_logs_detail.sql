-- Fitur: Audit log — kolom detail aktivitas database (user_name, table_name, detail).
-- Semua statement idempoten / ter-guard sehingga aman dijalankan berulang.

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_name" text;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "table_name" varchar(100);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "detail" text;

CREATE INDEX IF NOT EXISTS "idx_audit_logs_table_name" ON "audit_logs" ("table_name");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_timestamp" ON "audit_logs" ("user_id", "timestamp");
