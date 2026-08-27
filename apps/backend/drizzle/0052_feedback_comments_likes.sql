-- Fitur: Komentar & Like untuk modul Evaluasi / Usul Pengembangan Sistem
-- (system_feedback). Skrip ini idempotent dan aman dijalankan berulang.

-- Tabel komentar feedback.
CREATE TABLE IF NOT EXISTS "feedback_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"pesan" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_comments_feedback_id" ON "feedback_comments" USING btree ("feedback_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_comments_user_id" ON "feedback_comments" USING btree ("user_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_comments_feedback_id_fk'
  ) THEN
    ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_fk"
      FOREIGN KEY ("feedback_id") REFERENCES "system_feedback"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_comments_user_id_fk'
  ) THEN
    ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;
END $$;

-- Tabel like feedback (unique per feedback + user).
CREATE TABLE IF NOT EXISTS "feedback_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_likes_feedback_id" ON "feedback_likes" USING btree ("feedback_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_likes_feedback_user_unique" ON "feedback_likes" USING btree ("feedback_id", "user_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_likes_feedback_id_fk'
  ) THEN
    ALTER TABLE "feedback_likes" ADD CONSTRAINT "feedback_likes_feedback_id_fk"
      FOREIGN KEY ("feedback_id") REFERENCES "system_feedback"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feedback_likes_user_id_fk'
  ) THEN
    ALTER TABLE "feedback_likes" ADD CONSTRAINT "feedback_likes_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;
END $$;