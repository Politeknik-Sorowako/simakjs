ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "status_code" integer DEFAULT 200;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "is_success" boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS "idx_audit_logs_status_timestamp" ON "audit_logs" ("status_code", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_success_timestamp" ON "audit_logs" ("is_success", "timestamp");
