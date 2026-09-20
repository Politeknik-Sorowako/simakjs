import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const drizzleDir = join(import.meta.dir, '../../drizzle');
const journalPath = join(drizzleDir, 'meta/_journal.json');

/**
 * Guard regresi: setiap file migrasi SQL standalone di `drizzle/*.sql` WAJIB
 * terdaftar di `_journal.json`. Migrasi yang terlewat dari jurnal tidak pernah
 * diterapkan oleh `bunx drizzle-kit migrate` (jalur yang dipakai staging/produksi
 * melalui `db:safe-migrate`), sehingga perubahan skema tidak sampai ke DB.
 * Regresi nyata: `0072_krs_use_in_gpa.sql` tanpa entri jurnal memicu error 400
 * pada endpoint `/khs` di staging (kolom `use_in_gpa` tidak ada).
 */
describe('Coverage migrasi Drizzle di jurnal', () => {
  const sqlFiles = readdirSync(drizzleDir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ tag: string }>;
  };
  const journalTags = new Set(journal.entries.map((e) => e.tag));

  it('setiap migrasi SQL standalone terdaftar di _journal.json', () => {
    expect(sqlFiles.length).toBeGreaterThan(0);
    for (const file of sqlFiles) {
      const tag = file.replace(/\.sql$/, '');
      expect(journalTags.has(tag), `Migrasi ${file} tidak terdaftar di _journal.json`).toBe(true);
    }
  });
});
