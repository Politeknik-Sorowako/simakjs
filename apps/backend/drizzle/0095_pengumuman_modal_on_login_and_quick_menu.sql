-- Migrasi penambahan opsi modal login pada pengumuman dan quick_menu pada users
-- Idempoten: aman dijalankan berulang

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pengumuman' AND column_name = 'show_modal_on_login'
  ) THEN
    ALTER TABLE "pengumuman" ADD COLUMN "show_modal_on_login" boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'quick_menu'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "quick_menu" jsonb DEFAULT '[]'::jsonb NOT NULL;
  END IF;
END $$;
