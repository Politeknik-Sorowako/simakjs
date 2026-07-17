import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('4. Dosen (/dosen)', () => {
  let prodiId: number;

  beforeEach(async () => {
    await clearDatabase();
    // Setup prodi
    const adminToken = await getAuthToken('admin-dosen-setup@test.com', 'admin');
    const response = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-DOSEN-SETUP',
          nama: 'Teknik Informatika Dosen Setup',
          jenjang: 'D4',
        }),
      }),
    );
    const data = (await response.json()) as { id: number };
    prodiId = data.id;
  });

  describe('POST /dosen', () => {
    it('harus sukses menambahkan dosen baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
            nidn: '0001019001',
            nik: '9876543210123456',
            jenisKelamin: 'L',
            tanggalLahir: '1990-01-01',
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.nip).toBe('199001012020011001');
    });

    it('harus gagal menambahkan dosen jika payload tidak valid (Validation)', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: '', // invalid
            email: 'invalid-email',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal menambahkan dosen jika NIP duplikat (Constraint)', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');
      const payload = {
        nip: '199001012020011001',
        nama: 'Dosen Uji Coba',
        email: 'dosenuji@test.com',
        programStudiId: prodiId,
        nidn: '0001019001',
        nik: '9876543210123456',
        jenisKelamin: 'L' as const,
        tanggalLahir: '1990-01-01',
      };

      await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        }),
      );

      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            ...payload,
            email: 'other@test.com',
            nidn: '0001019002',
          }),
        }),
      );

      expect(response.status).toBe(409); // Conflict (23505 unique constraint)
    });

    it('harus gagal menambahkan jika diakses oleh Dosen/Mahasiswa/Guest (RBAC)', async () => {
      const dosenToken = await getAuthToken('dosen-dosen@test.com', 'dosen');

      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
          }),
        }),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /dosen', () => {
    let token: string;
    beforeEach(async () => {
      token = await getAuthToken('admin-dosen-setup@test.com', 'admin');
      const items = [
        {
          nip: '111',
          nama: 'Dosen Satu',
          email: 'dosen1@test.com',
          programStudiId: prodiId,
          nidn: '101',
          nik: '1234567890123451',
          jenisKelamin: 'L',
          tanggalLahir: '1980-01-01',
        },
        {
          nip: '222',
          nama: 'Dosen Dua',
          email: 'dosen2@test.com',
          programStudiId: prodiId,
          nidn: '102',
          nik: '1234567890123452',
          jenisKelamin: 'P',
          tanggalLahir: '1981-02-02',
        },
      ];
      for (const item of items) {
        await app.handle(
          new Request('http://localhost/dosen', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(item),
          }),
        );
      }
    });

    it('harus sukses mengambil list dosen (Default)', async () => {
      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(3);
    });

    it('harus sukses menggunakan pagination (page & limit)', async () => {
      const response = await app.handle(
        new Request('http://localhost/dosen?page=1&limit=1', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
    });

    it('harus sukses mencari dosen berdasarkan keyword search', async () => {
      const response = await app.handle(
        new Request('http://localhost/dosen?search=Satu', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].nip).toBe('111');
    });

    it('harus gagal mengambil list dosen jika diakses oleh Guest (RBAC)', async () => {
      const guestToken = await getAuthToken('guest-dosen@test.com', 'guest' as string & Record<never, never>);
      const response = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${guestToken}`,
          },
        }),
      );
      expect(response.status).toBe(403);
    });

    it('harus gagal mengambil list dosen jika tanpa token (Guest)', async () => {
      const response = await app.handle(new Request('http://localhost/dosen', { method: 'GET' }));
      expect(response.status).toBe(403);
    });
  });

  describe('GET /dosen/:id', () => {
    let dosenId: number;
    let token: string;

    beforeEach(async () => {
      token = await getAuthToken('admin-dosen@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
            nidn: '0001019001',
            nik: '9876543210123456',
            jenisKelamin: 'L',
            tanggalLahir: '1990-01-01',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      dosenId = data.id;
    });

    it('harus sukses mengambil detail dosen berdasarkan ID valid', async () => {
      const response = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nip).toBe('199001012020011001');
    });

    it('harus mengembalikan error 404 ketika ID dosen tidak ditemukan', async () => {
      const response = await app.handle(
        new Request('http://localhost/dosen/999999', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /dosen/:id', () => {
    let dosenId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
            nidn: '0001019001',
            nik: '9876543210123456',
            jenisKelamin: 'L',
            tanggalLahir: '1990-01-01',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      dosenId = data.id;
    });

    it('harus sukses memperbarui data dosen jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Dosen Uji Coba Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('Dosen Uji Coba Terupdate');
    });

    it('harus gagal memperbarui data dosen jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/dosen/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Dosen Uji Coba Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal memperbarui jika diakses oleh non-Admin (RBAC)', async () => {
      const dosenToken = await getAuthToken('dosen-dosen@test.com', 'dosen');

      const response = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            nama: 'Dosen Uji Coba Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /dosen/:id', () => {
    let dosenId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
            nidn: '0001019001',
            nik: '9876543210123456',
            jenisKelamin: 'L',
            tanggalLahir: '1990-01-01',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      dosenId = data.id;
    });

    it('harus sukses menghapus dosen jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      // Verify deletion
      const checkResponse = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(checkResponse.status).toBe(404);
    });

    it('harus gagal menghapus dosen jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-dosen@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/dosen/999999', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal menghapus jika diakses oleh non-Admin (RBAC)', async () => {
      const dosenToken = await getAuthToken('dosen-dosen@test.com', 'dosen');

      const response = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );

      expect(response.status).toBe(403);
    });
  });
});
