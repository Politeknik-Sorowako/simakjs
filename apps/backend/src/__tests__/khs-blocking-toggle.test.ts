import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi, tagihan } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Toggle Blocking KHS (BLOCK_KHS_JIKA_TANGGUNGAN)', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhsId: number;
  const periodeId = '20251';

  beforeEach(async () => {
    await clearDatabase();
    // system_settings tidak dibersihkan clearDatabase: reset ke default KHS = true.
    await SystemParameterService.set('BLOCK_KHS_JIKA_TANGGUNGAN', 'true');

    adminToken = await getAuthToken('admin_khs_block@test.com', 'admin');
    mhsToken = await getAuthToken('mhs_khs_block@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `KHB_${Date.now()}`, nama: 'Teknik Komputer', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250001',
        nama: 'Mahasiswa KHS Block',
        email: 'mhs_khs_block@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu KHS',
        nik: '1234567890123501',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2025/2026', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MKH_${Date.now()}`, nama: 'Jaringan', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    await db.insert(krs).values({ mahasiswaId: mhsId, kelasKuliahId: kelas.id, isApproved: true });

    // Tunggakan SPP untuk periode aktif.
    await db.insert(tagihan).values({ mahasiswaId: mhsId, periodeId, nominal: 2500000, status: 'belum_bayar' });
  });

  const getKhs = () =>
    app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );

  it('KHS diblokir saat toggle aktif (default)', async () => {
    const res = await getKhs();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean; reason?: string };
    expect(body.blocked).toBe(true);
    expect(body.reason).toBe('SPP Belum Lunas');
  });

  it('KHS lolos saat toggle dinonaktifkan admin walau ada tunggakan', async () => {
    const setRes = await app.handle(
      new Request('http://localhost/system/parameters/BLOCK_KHS_JIKA_TANGGUNGAN', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ value: 'false' }),
      }),
    );
    expect(setRes.status).toBe(200);

    const res = await getKhs();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean };
    expect(body.blocked).toBe(false);
  });
});
