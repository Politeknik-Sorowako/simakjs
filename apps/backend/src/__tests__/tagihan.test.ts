import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('9. Tagihan (/tagihan)', () => {
  let prodiId: number;
  let mhsId: number;
  let mkId: number;
  let kelasId: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-tagihan-setup@test.com', 'admin');

    // Create Prodi
    const prodiRes = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-TAGIHAN-SETUP',
          nama: 'Teknik Informatika Tagihan Setup',
          jenjang: 'D4',
        }),
      })
    );
    const prodiData = await prodiRes.json() as { id: number };
    prodiId = prodiData.id;

    // Create Mahasiswa
    const mhsRes = await app.handle(
      new Request('http://localhost/mahasiswa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nim: '88888888',
          nama: 'Mahasiswa Tagihan',
          email: 'mhs-tagihan@test.com',
          programStudiId: prodiId,
          namaIbuKandung: 'Ibu Tagihan',
          nik: '8888888888888888',
          jenisKelamin: 'L',
          tanggalLahir: '2002-01-01',
        }),
      })
    );
    const mhsData = await mhsRes.json() as { id: number };
    mhsId = mhsData.id;

    // Create MK
    const mkRes = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKTAG001',
          nama: 'Aljabar Linear',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      })
    );
    const mkData = await mkRes.json() as { id: number };
    mkId = mkData.id;

    // Create Periode
    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20231',
          nama: '2023/2024 Ganjil',
          aktif: true,
        }),
      })
    );

    // Create Kelas
    const kelasRes = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mataKuliahId: mkId,
          periodeId: '20231',
          namaKelas: 'TI-TAG-A',
        }),
      })
    );
    const kelasData = await kelasRes.json() as { id: number };
    kelasId = kelasData.id;
  });

  it('harus sukses generate tagihan secara massal oleh Admin', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');

    const generateRes = await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      })
    );

    expect(generateRes.status).toBe(201);
    const genBody = await generateRes.json();
    expect(genBody.count).toBeGreaterThan(0);

    // Check that student status has become non_aktif
    const checkMhsRes = await app.handle(
      new Request(`http://localhost/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })
    );
    const mhsBody = await checkMhsRes.json();
    expect(mhsBody.status).toBe('non_aktif');
  });

  it('mahasiswa non_aktif tidak boleh mengisi KRS', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');

    // Generate tagihan to set student to non_aktif
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      })
    );

    // Try creating KRS, should fail
    const krsRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          kelasKuliahId: kelasId,
        }),
      })
    );

    expect(krsRes.status).toBe(400);
    const krsBody = await krsRes.json();
    expect(krsBody.error).toContain('Silakan selesaikan pembayaran SPP/UKT');
  });

  it('setelah tagihan dibayar, mahasiswa aktif kembali dan bisa mengisi KRS serta disetujui Dosen PA', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');
    const dosenToken = await getAuthToken('dosen-tagihan@test.com', 'dosen');

    // Create Dosen PA
    await app.handle(
      new Request('http://localhost/dosen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nip: '987654321',
          nama: 'Dosen Wali',
          email: 'dosen-tagihan@test.com',
          programStudiId: prodiId,
        }),
      })
    );

    // Generate tagihan
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      })
    );

    // Get tagihan list to find the tagihan ID
    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })
    );
    const listBody = await listRes.json();
    const tagihanId = listBody.data[0].id;

    // Pay tagihan
    const payRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/bayar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })
    );
    expect(payRes.status).toBe(200);

    // Create KRS now (should succeed)
    const krsRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          kelasKuliahId: kelasId,
        }),
      })
    );
    expect(krsRes.status).toBe(201);

    // Dosen PA approves KRS
    const approveRes = await app.handle(
      new Request('http://localhost/krs/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          periodeId: '20231',
        }),
      })
    );
    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.count).toBeGreaterThan(0);
  });
});
