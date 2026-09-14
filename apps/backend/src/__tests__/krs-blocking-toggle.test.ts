import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, mahasiswa, mataKuliah, periodeAkademik, programStudi, tagihan } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Toggle Blocking KRS (BLOCK_KRS_JIKA_TANGGUNGAN)', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhsId: number;
  let kelasId: number;
  const periodeId = '20252';

  beforeEach(async () => {
    await clearDatabase();
    // system_settings tidak dibersihkan clearDatabase: reset ke default KRS = false.
    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'false');
    await SystemParameterService.set('KRS_MANDIRI_ENABLED', 'true');

    adminToken = await getAuthToken('admin_krs_block@test.com', 'admin');
    mhsToken = await getAuthToken('mhs_krs_block@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `KRB_${Date.now()}`, nama: 'Teknik Elektro', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250002',
        nama: 'Mahasiswa KRS Block',
        email: 'mhs_krs_block@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu KRS',
        nik: '1234567890123502',
        jenisKelamin: 'L',
        tanggalLahir: '2003-02-02',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Genap 2025/2026', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MKK_${Date.now()}`, nama: 'Elektronika', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    kelasId = kelas.id;
  });

  const createKrs = () =>
    app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ mahasiswaId: mhsId, kelasKuliahId: kelasId }),
      }),
    );

  it('KRS dapat dibuat saat toggle nonaktif (default) meski ada tunggakan', async () => {
    await db.insert(tagihan).values({ mahasiswaId: mhsId, periodeId, nominal: 1000000, status: 'belum_bayar' });
    const res = await createKrs();
    expect(res.status).toBe(201);
  });

  it('KRS ditolak (403) saat toggle aktif dan ada tunggakan', async () => {
    await db.insert(tagihan).values({ mahasiswaId: mhsId, periodeId, nominal: 1000000, status: 'belum_bayar' });
    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'true');

    const res = await createKrs();
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain('SPP');
  });

  it('KRS lolos saat toggle aktif tetapi tidak ada tunggakan', async () => {
    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'true');
    const res = await createKrs();
    expect(res.status).toBe(201);
  });

  it('staff dapat membuat KRS walau toggle aktif dan mahasiswa bertunggakan', async () => {
    await db.insert(tagihan).values({ mahasiswaId: mhsId, periodeId, nominal: 1000000, status: 'belum_bayar' });
    await SystemParameterService.set('BLOCK_KRS_JIKA_TANGGUNGAN', 'true');

    const res = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mahasiswaId: mhsId, kelasKuliahId: kelasId }),
      }),
    );
    expect(res.status).toBe(201);
  });
});
