import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  dosen,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  pasalPelanggaran,
  pelanggaran,
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { PelanggaranService } from '../services/pelanggaran.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('REGISTRATION_ENABLED', () => {
  it('register ditolak (403) saat parameter nonaktif', async () => {
    await clearDatabase();
    await SystemParameterService.set('REGISTRATION_ENABLED', 'false');
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'reg@test.com', password: 'Rahasia123', nama: 'Registrasi' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('register diizinkan (201) saat parameter aktif', async () => {
    await clearDatabase();
    await SystemParameterService.set('REGISTRATION_ENABLED', 'true');
    const res = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'reg2@test.com', password: 'Rahasia123', nama: 'Registrasi' }),
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe('Nilai Sikap (BPA Pasal 20)', () => {
  let mhsId: number;
  let prodiId: number;

  beforeEach(async () => {
    await clearDatabase();
    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `NS_${Date.now()}`, nama: 'Teknik Komputer', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250001',
        nama: 'Mahasiswa NS',
        email: `mhs_ns_${Date.now()}@test.com`,
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu NS',
        nik: '1234567890123001',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;
    await db.insert(periodeAkademik).values({ id: '20251', nama: 'Ganjil 2025/2026', aktif: true });
    const [pasal] = await db
      .insert(pasalPelanggaran)
      .values({ nomorPasal: 'P1', bunyiPasal: 'Kedisiplinan', jenisSanksi: 1, isActive: true })
      .returning();
    await db.insert(pelanggaran).values([
      {
        mahasiswaId: mhsId,
        tanggal: '2025-09-01',
        jenisPelanggaran: 'Lisan',
        keterangan: 'x',
        pasalId: pasal.id,
        jenisSanksi: 1,
        periodeId: '20251',
      },
      {
        mahasiswaId: mhsId,
        tanggal: '2025-09-02',
        jenisPelanggaran: 'Lisan',
        keterangan: 'x',
        pasalId: pasal.id,
        jenisSanksi: 1,
        periodeId: '20251',
      },
    ]);
    void prodiId;
  });

  it('AM turun 0.5 untuk dua peringatan lisan (Sangat Baik)', async () => {
    const ns = await PelanggaranService.getNilaiSikap(mhsId, '20251');
    expect(ns.degradasi).toBe(0.5);
    expect(ns.am).toBe(3.5);
    expect(ns.sebutan).toBe('Sangat Baik');
    expect(ns.narasi).toBe('Sangat Baik (3,50)');
  });
});

describe('Kunci nilai (unlock RBAC)', () => {
  it('dosen tidak dapat membuka kunci kelas yang terkunci', async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin_ns@test.com', 'admin');
    const dosenToken = await getAuthToken('dosen_ns@test.com', 'dosen');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `LK_${Date.now()}`, nama: 'Teknik Mesin', jenjang: 'D4' })
      .returning();
    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '1980000000000001',
        nama: 'Dosen NS',
        email: 'dosen_ns@test.com',
        programStudiId: prodi.id,
        nik: '1234567890123002',
        jenisKelamin: 'L',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    await db.insert(periodeAkademik).values({ id: '20251', nama: 'Ganjil 2025/2026', aktif: true });
    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: 'MK1', nama: 'MK 1', sksTotal: 3 })
      .returning();
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mk.id, periodeId: '20251', namaKelas: 'A', isLocked: true })
      .returning();

    // Admin bisa lock/unlock (lock sudah true). Dosen coba unlock → 403.
    void adminToken;
    void dsn;
    const unlockRes = await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelas.id}/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(unlockRes.status).toBe(403);
  });
});
