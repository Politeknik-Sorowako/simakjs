import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  cpmk,
  mataKuliah,
  periodeAkademik,
  programStudi,
  rencanaEvaluasi,
  rencanaEvaluasiSubCpmk,
  rps,
  rpsTopik,
  subCpmk,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Copy RPS Lintas Prodi (Kode Mata Kuliah Berbeda)', () => {
  let adminToken: string;
  let sourceRpsId: number;
  let sourceCpmkId: number;
  let sourceSubCpmkId: number;
  let sourceMkId: number;
  let targetMkId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-rps-copy@test.com', 'admin');

    const [prodiA] = await db
      .insert(programStudi)
      .values({ kode: 'TRPL', nama: 'Prodi TRPL', jenjang: 'D4' })
      .returning();
    const [prodiB] = await db
      .insert(programStudi)
      .values({ kode: 'TMES', nama: 'Prodi Mesin', jenjang: 'D4' })
      .returning();
    await db.insert(periodeAkademik).values([
      { id: '20241', nama: 'Ganjil 2024', aktif: false },
      { id: '20251', nama: 'Ganjil 2025', aktif: true },
    ]);

    const [mkA] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodiA.id, kode: 'BING-101', nama: 'Bahasa Inggris', sksTotal: 3 })
      .returning();
    sourceMkId = mkA.id;
    const [mkB] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodiB.id, kode: 'BING-201', nama: 'Bahasa Inggris', sksTotal: 3 })
      .returning();
    targetMkId = mkB.id;

    const [srcCpmk] = await db
      .insert(cpmk)
      .values({ mataKuliahId: mkA.id, kode: 'CPMK-1', deskripsi: 'Mampu memahami teks' })
      .returning();
    sourceCpmkId = srcCpmk.id;
    const [srcSub] = await db
      .insert(subCpmk)
      .values({ cpmkId: srcCpmk.id, kode: 'SUB-1', deskripsi: 'Menguasai kosakata', urutan: 1 })
      .returning();
    sourceSubCpmkId = srcSub.id;

    const [srcRps] = await db
      .insert(rps)
      .values({
        mataKuliahId: mkA.id,
        periodeId: '20241',
        deskripsi: 'RPS Bahasa Inggris Prodi TRPL',
        cplProdi: 'CPL 1, CPL 2',
      })
      .returning();
    sourceRpsId = srcRps.id;
    await db.insert(rpsTopik).values([
      {
        rpsId: srcRps.id,
        pertemuanKe: 1,
        topik: 'Introduction & Contract',
        subTopik: 'Syllabus, greeting',
        metode: 'Ceramah',
        cpmkId: srcCpmk.id,
        subCpmkId: srcSub.id,
      },
      {
        rpsId: srcRps.id,
        pertemuanKe: 2,
        topik: 'Daily Activities',
        subTopik: 'Present tense',
        metode: 'Diskusi',
        cpmkId: srcCpmk.id,
        subCpmkId: srcSub.id,
      },
    ]);
    await db.insert(rencanaEvaluasi).values([
      { mataKuliahId: mkA.id, namaEvaluasi: 'UTS', bobotEvaluasi: '30', deskripsi: 'Ujian Tengah Semester' },
      { mataKuliahId: mkA.id, namaEvaluasi: 'UAS', bobotEvaluasi: '40', deskripsi: 'Ujian Akhir Semester' },
    ]);
  });

  async function copyPayload(opts: { copyCpmk?: boolean; copyRencanaEvaluasi?: boolean } = {}) {
    return {
      sourceRpsId,
      targetPeriodeId: '20251',
      targetMataKuliahId: targetMkId,
      copyCpmk: opts.copyCpmk ?? true,
      copyRencanaEvaluasi: opts.copyRencanaEvaluasi ?? true,
    };
  }

  it('menyalin RPS lintas prodi + membuat CPMK baru di target dan memetakan topik', async () => {
    const res = await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(await copyPayload({ copyCpmk: true })),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.mataKuliahId).toBe(targetMkId);
    expect(body.periodeId).toBe('20251');

    const [targetRps] = await db
      .select()
      .from(rps)
      .where(and(eq(rps.mataKuliahId, targetMkId), eq(rps.periodeId, '20251')));
    expect(targetRps).toBeDefined();
    expect(targetRps.deskripsi).toBe('RPS Bahasa Inggris Prodi TRPL');
    expect(targetRps.cplProdi).toBe('CPL 1, CPL 2');

    // CPMK baru dibuat di MK target
    const targetCpmks = await db.select().from(cpmk).where(eq(cpmk.mataKuliahId, targetMkId));
    expect(targetCpmks).toHaveLength(1);
    expect(targetCpmks[0].kode).toBe('CPMK-1');

    const targetSubs = await db.select().from(subCpmk).where(eq(subCpmk.cpmkId, targetCpmks[0].id));
    expect(targetSubs).toHaveLength(1);
    expect(targetSubs[0].kode).toBe('SUB-1');

    // Topik tersalin lengkap dengan CPMK/Sub-CPMK yang dipetakan ke ID baru
    const topiks = await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, targetRps.id));
    expect(topiks).toHaveLength(2);
    for (const t of topiks) {
      expect(t.cpmkId).toBe(targetCpmks[0].id);
      expect(t.subCpmkId).toBe(targetSubs[0].id);
    }

    // Rencana evaluasi tersalin ke MK target
    const targetEvals = await db.select().from(rencanaEvaluasi).where(eq(rencanaEvaluasi.mataKuliahId, targetMkId));
    expect(targetEvals.map((e) => e.namaEvaluasi).sort()).toEqual(['UAS', 'UTS']);
  });

  it('tanpa copyCpmk, topik tetap tersalin lengkap dengan cpmkId null', async () => {
    const res = await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(await copyPayload({ copyCpmk: false })),
      }),
    );
    expect(res.status).toBe(201);

    const [targetRps] = await db
      .select()
      .from(rps)
      .where(and(eq(rps.mataKuliahId, targetMkId), eq(rps.periodeId, '20251')));
    const topiks = await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, targetRps.id));
    expect(topiks).toHaveLength(2);
    for (const t of topiks) {
      expect(t.cpmkId).toBeNull();
      expect(t.subCpmkId).toBeNull();
    }

    // Tidak ada CPMK baru yang dibuat pada MK target
    const targetCpmks = await db.select().from(cpmk).where(eq(cpmk.mataKuliahId, targetMkId));
    expect(targetCpmks).toHaveLength(0);
  });

  it('copy untuk MK yang sama (satu prodi) tetap mempertahankan referensi CPMK asli', async () => {
    const res = await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceRpsId,
          targetPeriodeId: '20251',
          targetMataKuliahId: sourceMkId,
          copyCpmk: true,
          copyRencanaEvaluasi: true,
        }),
      }),
    );
    expect(res.status).toBe(201);

    const [targetRps] = await db
      .select()
      .from(rps)
      .where(and(eq(rps.mataKuliahId, sourceMkId), eq(rps.periodeId, '20251')));
    const topiks = await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, targetRps.id));
    expect(topiks).toHaveLength(2);
    for (const t of topiks) {
      expect(t.cpmkId).toBe(sourceCpmkId);
      expect(t.subCpmkId).toBe(sourceSubCpmkId);
    }
  });

  it('menolak penyalinan duplikat pada MK & periode target yang sama', async () => {
    await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(await copyPayload()),
      }),
    );
    const res = await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(await copyPayload()),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('RPS sudah ada');
  });

  it('GET /rps/available-sources mengembalikan RPS sumber dengan topik & info prodi', async () => {
    const res = await app.handle(
      new Request('http://localhost/rps/available-sources?search=Inggris', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThan(0);
    const src = body.find((b: { id: number }) => b.id === sourceRpsId);
    expect(src).toBeDefined();
    expect(src.kodeMataKuliah).toBe('BING-101');
    expect(src.namaMataKuliah).toBe('Bahasa Inggris');
    expect(src.prodiNama).toBe('Prodi TRPL');
    expect(src.jumlahTopik).toBe(2);
  });

  it('copy lintas prodi memetakan link Sub-CPMK pada rencana evaluasi bila CPMK dibuat', async () => {
    // Seed link evaluasi -> sub-cpmk pada sumber
    const [srcUts] = await db
      .select()
      .from(rencanaEvaluasi)
      .where(and(eq(rencanaEvaluasi.mataKuliahId, sourceMkId), eq(rencanaEvaluasi.namaEvaluasi, 'UTS')));
    await db
      .insert(rencanaEvaluasiSubCpmk)
      .values({ rencanaEvaluasiId: srcUts.id, subCpmkId: sourceSubCpmkId, bobot: '100' });

    const res = await app.handle(
      new Request('http://localhost/rps/copy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(await copyPayload({ copyCpmk: true })),
      }),
    );
    expect(res.status).toBe(201);

    const targetEvals = await db.select().from(rencanaEvaluasi).where(eq(rencanaEvaluasi.mataKuliahId, targetMkId));
    expect(targetEvals).toHaveLength(2);
    const [utsTarget] = targetEvals.filter((e) => e.namaEvaluasi === 'UTS');
    expect(utsTarget).toBeDefined();

    const [targetCpmk] = await db.select().from(cpmk).where(eq(cpmk.mataKuliahId, targetMkId));
    const [targetSub] = await db.select().from(subCpmk).where(eq(subCpmk.cpmkId, targetCpmk.id));
    expect(targetSub).toBeDefined();

    const links = await db
      .select()
      .from(rencanaEvaluasiSubCpmk)
      .where(eq(rencanaEvaluasiSubCpmk.rencanaEvaluasiId, utsTarget.id));
    expect(links).toHaveLength(1);
    expect(links[0].subCpmkId).toBe(targetSub.id);
    expect(links[0].bobot).toBe('100.00');
  });
});
