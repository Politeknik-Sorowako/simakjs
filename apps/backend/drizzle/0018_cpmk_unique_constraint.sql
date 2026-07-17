-- Add unique constraint on (mata_kuliah_id, kode) to prevent duplicate CPMK codes per mata kuliah
ALTER TABLE "cpmk" ADD CONSTRAINT "cpmk_mata_kuliah_kode_unique" UNIQUE("mata_kuliah_id", "kode");
