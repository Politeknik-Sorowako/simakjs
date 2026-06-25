import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken } from './test-helper';

describe('8. KRS (/krs)', () => {
  let prodiId: number;
  let mhsId: number;
  let mkId: number;
  let kelasId: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-krs-setup@test.com', 'admin');

    const prodiRes = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-KRS-SETUP',
          nama: 'Teknik Informatika KRS Setup',
          jenjang: 'D4',
        }),
      })
    );
    const prodiData = await prodiRes.json() as { id: number };
    prodiId = prodiData.id;

    const mhsRes = await app.handle(
      new Request('http://localhost/mahasiswa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nim: '99999999',
          nama: 'Mahasiswa KRS',
          email: 'mhs-krs@test.com',
          programStudiId: prodiId,
          namaIbuKandung: 'Ibu KRS',
          nik: '9999999999999999',
          jenisKelamin: 'L',
          tanggalLahir: '2002-01-01',
        }),
      })
    );
    const mhsData = await mhsRes.json() as { id: number };
    mhsId = mhsData.id;

    const mkRes = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKKRS001',
          nama: 'Logika Matematika',
          sksTotal: 2,
          programStudiId: prodiId,
        }),
      })
    );
    const mkData = await mkRes.json() as { id: number };
    mkId = mkData.id;

    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20233',
          nama: '2023/2024 Pendek',
          aktif: true,
        }),
      })
    );

    const kelasRes = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mataKuliahId: mkId,
          periodeId: '20233',
          namaKelas: 'TI-KRS-A',
        }),
      })
    );
    const kelasData = await kelasRes.json() as { id: number };
    kelasId = kelasData.id;
  });

  describe('POST /krs', () => {
    it('harus sukses menambahkan KRS baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
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

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
    });

    it('harus gagal menambahkan jika payload tidak lengkap (Validation)', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/krs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: 'invalid-id', // type error
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal jika diakses tanpa token JWT (Guest)', async () => {
      const response = await app.handle(
        new Request('http://localhost/krs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            kelasKuliahId: kelasId,
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /krs', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      await app.handle(
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
    });

    it('harus sukses mengambil list KRS', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/krs', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /krs/:id', () => {
    let krsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const res = await app.handle(
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
      const data = await res.json() as { id: number };
      krsId = data.id;
    });

    it('harus sukses mengambil detail KRS berdasarkan ID valid', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const response = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.mahasiswaId).toBe(mhsId);
    });

    it('harus mengembalikan error 404 jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/krs/999999', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /krs/:id', () => {
    let krsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const res = await app.handle(
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
      const data = await res.json() as { id: number };
      krsId = data.id;
    });

    it('harus sukses memperbarui KRS (input nilai) jika diakses oleh Admin/Dosen dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nilaiAngka: 85.50,
            nilaiHuruf: 'A',
            nilaiIndeks: 4.00,
          }),
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Number(body.nilaiAngka)).toBe(85.50);
      expect(body.nilaiHuruf).toBe('A');
    });

    it('harus gagal memperbarui jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/krs/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nilaiAngka: 85.50,
          }),
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /krs/:id', () => {
    let krsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');
      const res = await app.handle(
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
      const data = await res.json() as { id: number };
      krsId = data.id;
    });

    it('harus sukses menghapus KRS jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
    });

    it('harus gagal menghapus jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-krs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/krs/999999', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(404);
    });
  });
});
