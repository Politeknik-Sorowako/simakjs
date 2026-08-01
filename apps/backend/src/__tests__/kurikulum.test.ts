import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Kurikulum Batch Delete (/kurikulum)', () => {
  let prodiId: number;
  let kurikulumId: number;
  let mkId1: number;
  let mkId2: number;
  let mkId3: number;
  let adminToken: string;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-kurikulum-test@test.com', 'admin');

    // 0. Create Periode Akademik
    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20261',
          nama: '2026/2027 Ganjil',
          semester: '1',
          tahunAjaran: '2026/2027',
          isAktif: true,
        }),
      }),
    );

    // 1. Create Prodi
    const prodiRes = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-KUR-TEST',
          nama: 'Teknik Informatika Kurikulum Test',
          jenjang: 'D4',
        }),
      }),
    );
    const prodiData = (await prodiRes.json()) as { id: number };
    prodiId = prodiData.id;

    // 2. Create Kurikulum
    const kurRes = await app.handle(
      new Request('http://localhost/kurikulum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'KUR-TEST-2026',
          nama: 'Kurikulum Test 2026',
          programStudiId: prodiId,
          semesterMulai: '20261',
          jumlahSksLulus: 144,
          jumlahSksWajib: 120,
          jumlahSksPilihan: 24,
          isAktif: true,
        }),
      }),
    );
    const kurData = (await kurRes.json()) as { id: number };
    kurikulumId = kurData.id;

    // 3. Create 3 Mata Kuliah
    const mk1Res = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKBD001',
          nama: 'Matkul Batch 1',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      }),
    );
    mkId1 = ((await mk1Res.json()) as { id: number }).id;

    const mk2Res = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKBD002',
          nama: 'Matkul Batch 2',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      }),
    );
    mkId2 = ((await mk2Res.json()) as { id: number }).id;

    const mk3Res = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKBD003',
          nama: 'Matkul Batch 3',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      }),
    );
    mkId3 = ((await mk3Res.json()) as { id: number }).id;

    // 4. Attach 3 MKs to Kurikulum
    for (const [idx, mkId] of [mkId1, mkId2, mkId3].entries()) {
      await app.handle(
        new Request(`http://localhost/kurikulum/${kurikulumId}/mata-kuliah`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            semester: idx + 1,
            sksMataKuliah: 3,
            isWajib: true,
          }),
        }),
      );
    }
  });

  it('harus sukses menghapus beberapa mata kuliah sekaligus via batch delete endpoint', async () => {
    // Call batch delete for mkId1 & mkId2
    const response = await app.handle(
      new Request(`http://localhost/kurikulum/${kurikulumId}/mata-kuliah/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mataKuliahIds: [mkId1, mkId2],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { message: string; deletedCount: number };
    expect(body.deletedCount).toBe(2);

    // Verify kurikulum detail now only has 1 MK remaining (mkId3)
    const detailRes = await app.handle(
      new Request(`http://localhost/kurikulum/${kurikulumId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    const detailData = (await detailRes.json()) as {
      kurikulumMataKuliah: { mataKuliahId: number }[];
    };
    expect(detailData.kurikulumMataKuliah.length).toBe(1);
    expect(detailData.kurikulumMataKuliah[0].mataKuliahId).toBe(mkId3);
  });

  it('harus gagal batch delete jika diakses oleh non-Admin (RBAC)', async () => {
    const mhsToken = await getAuthToken('mhs-kurikulum-test@test.com', 'mahasiswa');
    const response = await app.handle(
      new Request(`http://localhost/kurikulum/${kurikulumId}/mata-kuliah/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mhsToken}`,
        },
        body: JSON.stringify({
          mataKuliahIds: [mkId1],
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
