import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Pengaturan KRS Mandiri (KRS_MANDIRI_ENABLED)', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhsId: number;
  let kelasId: number;
  const periodeId = '20241';

  beforeEach(async () => {
    await clearDatabase();
    // system_settings tidak dibersihkan oleh clearDatabase; pastikan flag kembali aktif.
    await SystemParameterService.set('KRS_MANDIRI_ENABLED', 'true');

    adminToken = await getAuthToken('admin_krs_mandiri@test.com', 'admin');
    mhsToken = await getAuthToken('mhs_krs_mandiri@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `KRM_${Date.now()}`, nama: 'Teknik Mesin', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240001',
        nama: 'Mahasiswa KRS Mandiri',
        email: 'mhs_krs_mandiri@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu KRS',
        nik: '1234567890123499',
        jenisKelamin: 'L',
        tanggalLahir: '2002-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2024/2025', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MK_${Date.now()}`, nama: 'Algoritma', sksTotal: 3 })
      .returning();

    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    kelasId = kelas.id;
  });

  it('default flag KRS mandiri adalah true (fail-open) dan terekspos di endpoint publik', async () => {
    const res = await app.handle(new Request('http://localhost/settings/public', { method: 'GET' }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { krsMandiriEnabled: boolean } };
    expect(json.data.krsMandiriEnabled).toBe(true);
  });

  it('mahasiswa dapat membuat KRS saat flag aktif (default)', async () => {
    const res = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ mahasiswaId: mhsId, kelasKuliahId: kelasId }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it('mahasiswa ditolak (403) saat flag dinonaktifkan, staff tetap dapat membuat KRS', async () => {
    const setRes = await app.handle(
      new Request('http://localhost/system/parameters/KRS_MANDIRI_ENABLED', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ value: 'false' }),
      }),
    );
    expect(setRes.status).toBe(200);

    const pubRes = await app.handle(new Request('http://localhost/settings/public', { method: 'GET' }));
    const pubJson = (await pubRes.json()) as { data: { krsMandiriEnabled: boolean } };
    expect(pubJson.data.krsMandiriEnabled).toBe(false);

    const mhsRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ mahasiswaId: mhsId, kelasKuliahId: kelasId }),
      }),
    );
    expect(mhsRes.status).toBe(403);

    const adminRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mahasiswaId: mhsId, kelasKuliahId: kelasId }),
      }),
    );
    expect(adminRes.status).toBe(201);
  });
});
