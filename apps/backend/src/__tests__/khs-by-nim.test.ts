import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi, tagihan } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('KHS Resolver NIM & RBAC', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhsId: number;
  const periodeId = '20251';

  beforeEach(async () => {
    await clearDatabase();
    await SystemParameterService.set('BLOCK_KHS_JIKA_TANGGUNGAN', 'false');

    adminToken = await getAuthToken('admin_khsnim@test.com', 'admin');
    mhsToken = await getAuthToken('mhs_khsnim@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `KSN_${Date.now()}`, nama: 'Teknik Sipil', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250077',
        nama: 'Mahasiswa KHS NIM',
        email: 'mhs_khsnim@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu KSN',
        nik: '1234567890123577',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2025/2026', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MKN_${Date.now()}`, nama: 'Fisika', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    await db.insert(krs).values({ mahasiswaId: mhsId, kelasKuliahId: kelas.id, isApproved: true });
  });

  it('KHS by-nim: mahasiswa hanya bisa akses NIM sendiri', async () => {
    const res = await app.handle(
      new Request(`http://localhost/khs/by-nim?nim=20250077&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean };
    expect(body.blocked).toBe(false);
  });

  it('KHS by-nim: mahasiswa ditolak akses NIM lain (403)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/khs/by-nim?nim=99999999&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('KHS by-nim: admin dapat mengakses dan matriks-nilai ditolak untuk mahasiswa', async () => {
    const res = await app.handle(
      new Request(`http://localhost/khs/by-nim?nim=20250077&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);

    const matriks = await app.handle(
      new Request('http://localhost/khs/matriks-nilai', {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(matriks.status).toBe(403);
  });

  it('staff menerima warningTunggakan via getByMhsIdAndPeriode saat ada tunggakan', async () => {
    await SystemParameterService.set('BLOCK_KHS_JIKA_TANGGUNGAN', 'true');
    await db.insert(tagihan).values({ mahasiswaId: mhsId, periodeId, nominal: 2500000, status: 'belum_bayar' });

    const res = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blocked: boolean; warningTunggakan?: { reason: string | null } };
    expect(body.blocked).toBe(false);
    expect(body.warningTunggakan?.reason).toBe('SPP Belum Lunas');
  });
});
