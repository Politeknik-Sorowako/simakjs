import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  angkatanKurikulum,
  kelasKuliah,
  krs,
  kurikulum,
  kurikulumMataKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  userProdiScopes,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

interface Paginated {
  data: Array<{ id: number }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('Prodi-scope pada read KRS', () => {
  const periode = '20261';
  let adminToken: string;
  let prodiAToken: string;
  let prodiAId: number;
  let prodiBId: number;
  let krsAId: number;
  let krsBId: number;
  let mhsAId: number;
  let mhsBId: number;
  let kelasBId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_scope_test@test.com', 'admin');

    const [prodiA] = await db
      .insert(programStudi)
      .values({ kode: `SCPA_${Date.now()}`, nama: 'Prodi Scope A', jenjang: 'D4' })
      .returning();
    const [prodiB] = await db
      .insert(programStudi)
      .values({ kode: `SCPB_${Date.now()}`, nama: 'Prodi Scope B', jenjang: 'D4' })
      .returning();
    prodiAId = prodiA.id;
    prodiBId = prodiB.id;

    await db.insert(periodeAkademik).values({ id: periode, nama: 'Ganjil 2026/2027', aktif: true });

    const [mkA] = await db
      .insert(mataKuliah)
      .values({ kode: `SCPA_MK_${Date.now()}`, nama: 'MK Scope A', sksTotal: 3, programStudiId: prodiAId })
      .returning();
    const [mkB] = await db
      .insert(mataKuliah)
      .values({ kode: `SCPB_MK_${Date.now()}`, nama: 'MK Scope B', sksTotal: 3, programStudiId: prodiBId })
      .returning();

    const kelas = await db
      .insert(kelasKuliah)
      .values([
        { mataKuliahId: mkA.id, periodeId: periode, namaKelas: 'Scope-A' },
        { mataKuliahId: mkB.id, periodeId: periode, namaKelas: 'Scope-B' },
      ])
      .returning();
    const [kelasA, kelasB] = kelas;
    kelasBId = kelasB.id;

    const [mhsA] = await db
      .insert(mahasiswa)
      .values({
        nim: `SA${String(Date.now()).slice(-5)}`,
        nama: 'Mhs Scope A',
        email: `mhs_scope_a_${Date.now()}@test.com`,
        programStudiId: prodiAId,
        status: 'aktif',
        angkatan: '2026',
        namaIbuKandung: 'Ibu A',
        nik: `NIKA${String(Date.now()).slice(-12)}`,
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsAId = mhsA.id;
    const [mhsB] = await db
      .insert(mahasiswa)
      .values({
        nim: `SB${String(Date.now()).slice(-5)}`,
        nama: 'Mhs Scope B',
        email: `mhs_scope_b_${Date.now()}@test.com`,
        programStudiId: prodiBId,
        status: 'aktif',
        namaIbuKandung: 'Ibu B',
        nik: `NIKB${String(Date.now()).slice(-12)}`,
        jenisKelamin: 'P',
        tanggalLahir: '2001-01-01',
      })
      .returning();
    mhsBId = mhsB.id;

    const insertedKrs = await db
      .insert(krs)
      .values([
        { mahasiswaId: mhsA.id, kelasKuliahId: kelasA.id, isApproved: false },
        { mahasiswaId: mhsB.id, kelasKuliahId: kelasBId, isApproved: true },
      ])
      .returning();
    krsAId = insertedKrs[0].id;
    krsBId = insertedKrs[1].id;

    // Binding kurikulum aktif untuk mhsA (prodi A) agar getRencanaStudi/validasiKrs mengembalikan data.
    const [kur] = await db
      .insert(kurikulum)
      .values({
        kode: `SCPK_${Date.now()}`,
        nama: 'Kurikulum Scope',
        programStudiId: prodiAId,
        semesterMulai: periode,
        jumlahSksLulus: 144,
        jumlahSksWajib: 120,
        jumlahSksPilihan: 24,
        isAktif: true,
      })
      .returning();
    await db.insert(angkatanKurikulum).values({
      programStudiId: prodiAId,
      angkatan: '2026',
      kurikulumId: kur.id,
      isActive: true,
    });
    await db.insert(kurikulumMataKuliah).values({
      kurikulumId: kur.id,
      mataKuliahId: mkA.id,
      semester: 1,
      sksMataKuliah: 3,
      isWajib: true,
    });

    prodiAToken = await getAuthToken('prodi_scope_a@test.com', 'prodi');
    const [prodiUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, 'prodi_scope_a@test.com'));
    await db.insert(userProdiScopes).values({ userId: prodiUser.id, programStudiId: prodiAId });
  });

  describe('GET /krs (listing)', () => {
    it('admin tetap global: melihat seluruh prodi tanpa filter', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs?periodeId=${periode}&limit=50`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(2);
    });

    it('prodi hanya melihat KRS pada prodi yang di-scope (tanpa parameter programStudiId)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs?periodeId=${periode}&limit=50`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(1);
      expect(body.data[0].id).toBe(krsAId);
    });

    it('prodi meminta programStudiId di dalam scope → tetap terlihat', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs?periodeId=${periode}&programStudiId=${prodiAId}&limit=50`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(1);
      expect(body.data[0].id).toBe(krsAId);
    });

    it('prodi meminta programStudiId di luar scope → list kosong (fail-closed)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs?periodeId=${periode}&programStudiId=${prodiBId}&limit=50`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(0);
    });

    it('prodi tanpa scope prodi apa pun → list kosong', async () => {
      const noScopeToken = await getAuthToken('prodi_noscope@test.com', 'prodi');
      const res = await app.handle(
        new Request(`http://localhost/krs?periodeId=${periode}&limit=50`, {
          headers: { Authorization: `Bearer ${noScopeToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(0);
      expect(body.meta.totalPages).toBe(0);
    });
  });

  describe('GET /krs?kelasKuliahId= (roster dosen)', () => {
    it('dosen tetap melihat seluruh mahasiswa di kelas saat kelasKuliahId diberikan', async () => {
      const dosenToken = await getAuthToken('dosen_roster_scope@test.com', 'dosen');
      const res = await app.handle(
        new Request(`http://localhost/krs?kelasKuliahId=${kelasBId}&limit=50`, {
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Paginated;
      expect(body.meta.total).toBe(1);
      expect(body.data[0].id).toBe(krsBId);
    });
  });

  describe('GET /krs/pending (getPendingStudents)', () => {
    it('prodi hanya melihat mahasiswa pending pada prodi yang di-scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/pending-students?periodeId=${periode}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Array<{ id: number }>;
      expect(body.map((m) => m.id)).toEqual([mhsAId]);
    });
  });

  describe('GET /krs/rencana-studi (getRencanaStudi)', () => {
    it('prodi dapat mengakses rencana studi mahasiswa di dalam scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/rencana-studi?mahasiswaId=${mhsAId}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('prodi ditolak mengakses rencana studi mahasiswa di luar scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/rencana-studi?mahasiswaId=${mhsBId}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('guest ditolak mengakses rencana studi', async () => {
      const guestToken = await getAuthToken('guest_scope@test.com', 'mahasiswa');
      // guest dibuat sebagai mahasiswa role; ganti role ke guest langsung di DB.
      await db.update(users).set({ role: 'guest' }).where(eq(users.email, 'guest_scope@test.com'));
      const res = await app.handle(
        new Request(`http://localhost/krs/rencana-studi?mahasiswaId=${mhsAId}`, {
          headers: { Authorization: `Bearer ${guestToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /krs/validasi (validasiKrs)', () => {
    it('prodi dapat memvalidasi KRS mahasiswa di dalam scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/validasi?mahasiswaId=${mhsAId}&periodeId=${periode}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('prodi ditolak memvalidasi KRS mahasiswa di luar scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/validasi?mahasiswaId=${mhsBId}&periodeId=${periode}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /krs/stats (getStats)', () => {
    it('admin global melihat total seluruh prodi', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/stats?periodeId=${periode}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number };
      expect(body.total).toBe(2);
    });

    it('prodi hanya melihat stats prodi yang di-scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/stats?periodeId=${periode}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number; perProdi: unknown[] };
      expect(body.total).toBe(1);
      expect(body.perProdi).toHaveLength(1);
    });
  });

  describe('GET /krs/:id (getById)', () => {
    it('prodi dapat mengakses baris KRS pada prodi yang di-scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/${krsAId}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('prodi ditolak mengakses baris KRS di luar scope', async () => {
      const res = await app.handle(
        new Request(`http://localhost/krs/${krsBId}`, {
          headers: { Authorization: `Bearer ${prodiAToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });
});
