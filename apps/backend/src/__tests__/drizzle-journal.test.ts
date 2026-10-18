import { describe, expect, it } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Penjaga agar file migrasi tidak "hilang" dari `drizzle/meta/_journal.json`.
 *
 * `drizzle-kit migrate` HANYA menjalankan entri yang ada di journal; file `.sql`
 * yang tidak terdaftar dilewati tanpa error. Gejalanya senyap: deploy sukses,
 * tetapi tabelnya tidak pernah dibuat sehingga endpoint yang membacanya gagal
 * 500 di staging/produksi — sementara test lokal lolos karena `pre-test.ts`
 * memakai `drizzle-kit push` yang menyinkronkan skema langsung dari
 * `schema.ts` dan tidak membaca journal.
 */
const DRIZZLE_DIR = join(import.meta.dir, '..', '..', 'drizzle');
const JOURNAL_PATH = join(DRIZZLE_DIR, 'meta', '_journal.json');

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

/** Ambil awalan numerik tag migrasi (`0089_something` → 89). */
function tagNumber(tag: string): number {
  const m = /^(\d+)_/.exec(tag);
  return m ? Number(m[1]) : -1;
}

describe('migrasi drizzle: file baru wajib terdaftar di journal', () => {
  it('setiap file migrasi yang lebih baru dari entri journal terakhir ikut terdaftar', async () => {
    const journal = JSON.parse(await readFile(JOURNAL_PATH, 'utf8')) as Journal;
    const files = (await readdir(DRIZZLE_DIR)).filter((f) => f.endsWith('.sql'));
    const journalTags = new Set(journal.entries.map((e) => e.tag));

    const maxJournalNumber = Math.max(...journal.entries.map((e) => tagNumber(e.tag)));

    // Migrasi yang penomorannya melampaui entri terakhir HARUS terdaftar —
    // inilah bentuk bug yang membuat tabel `aktivitas_mbkm_status_log` tidak
    // pernah dibuat di staging.
    const unregisteredNewFiles = files
      .map((f) => f.replace(/\.sql$/, ''))
      .filter((tag) => tagNumber(tag) > maxJournalNumber && !journalTags.has(tag));

    expect(unregisteredNewFiles).toEqual([]);
  });

  it('setiap entri journal memiliki file SQL-nya', async () => {
    const journal = JSON.parse(await readFile(JOURNAL_PATH, 'utf8')) as Journal;
    const files = new Set((await readdir(DRIZZLE_DIR)).filter((f) => f.endsWith('.sql')));

    const entriesWithoutFile = journal.entries.map((e) => e.tag).filter((tag) => !files.has(`${tag}.sql`));

    expect(entriesWithoutFile).toEqual([]);
  });

  it('tag entri journal unik dan when-nya tidak mundur dari entri terakhir', async () => {
    const journal = JSON.parse(await readFile(JOURNAL_PATH, 'utf8')) as Journal;
    const tags = journal.entries.map((e) => e.tag);

    expect(new Set(tags).size).toBe(tags.length);

    // `when` entri terakhir menentukan migrasi mana yang dianggap belum
    // ter-apply. Entri terakhir tidak boleh lebih kecil dari sebelumnya, jika
    // tidak migrasi baru akan dianggap sudah pernah dijalankan.
    const last = journal.entries[journal.entries.length - 1];
    const prev = journal.entries[journal.entries.length - 2];
    expect(last.when).toBeGreaterThan(prev.when);
  });
});
