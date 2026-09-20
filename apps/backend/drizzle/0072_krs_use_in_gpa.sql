-- Fitur: Pilihan nilai yang masuk perhitungan GPA/IPK pada kasus MK diambil ulang
-- (mis. cuti tengah semester lalu mengulang). Kolom use_in_gpa menandai attempt mana
-- yang dihitung ke IPK. Default true; satu MK boleh memiliki beberapa baris KRS
-- (periode/kelas berbeda), dan admin/dosen dapat mengubah yang dipakai.
-- Idempoten: aman dijalankan berulang.

ALTER TABLE "krs" ADD COLUMN IF NOT EXISTS "use_in_gpa" boolean NOT NULL DEFAULT true;