import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('6. Mata Kuliah (/mata-kuliah)', () => {
  let prodiId: number;

  beforeEach(async () => {
    await clearDatabase();
    // Setup prodi
    const adminToken = await getAuthToken('admin-mk-setup@test.com', 'admin');
    const response = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-MK-SETUP',
          nama: 'Teknik Informatika MK Setup',
          jenjang: 'D4',
        }),
      }),
    );
    const data = (await response.json()) as { id: number };
    prodiId = data.id;
  });

  describe('POST /mata-kuliah', () => {
    it('harus sukses menambahkan mata kuliah baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data & Algoritma',
            sksTotal: 4,
            sksTatapMuka: 2,
            sksPraktek: 2,
            programStudiId: prodiId,
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.kode).toBe('MKTEST001');
    });

    it('harus gagal menambahkan jika payload tidak lengkap (Validation)', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            sksTotal: 'invalid', // type error
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-mk@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data & Algoritma',
            sksTotal: 4,
            programStudiId: prodiId,
          }),
        }),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /mata-kuliah', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );
    });

    it('harus sukses mengambil list mata kuliah', async () => {
      const response = await app.handle(new Request('http://localhost/mata-kuliah', { method: 'GET' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /mata-kuliah/:id', () => {
    let mkId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      mkId = data.id;
    });

    it('harus sukses mengambil detail mata kuliah berdasarkan ID valid', async () => {
      const response = await app.handle(new Request(`http://localhost/mata-kuliah/${mkId}`, { method: 'GET' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.kode).toBe('MKTEST001');
    });

    it('harus mengembalikan error 404 jika ID tidak ditemukan', async () => {
      const response = await app.handle(new Request('http://localhost/mata-kuliah/999999', { method: 'GET' }));
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /mata-kuliah/:id', () => {
    let mkId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      mkId = data.id;
    });

    it('harus sukses memperbarui mata kuliah jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mkId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Struktur Data Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('Struktur Data Terupdate');
    });

    it('harus gagal memperbarui jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /mata-kuliah/:id', () => {
    let mkId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      mkId = data.id;
    });

    it('harus sukses menghapus mata kuliah jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mkId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
    });

    it('harus gagal menghapus jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-mk@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah/999999', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /mata-kuliah/import', () => {
    it('harus menyembunyikan query SQL mentah, memberikan nomor baris CSV yang tepat, dan pesan ramah pengguna ketika import gagal', async () => {
      const adminToken = await getAuthToken('admin-mk-import@test.com', 'admin');

      // First create a Mata Kuliah to cause duplicate error
      await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKIMP001',
            nama: 'Algoritma & Pemrograman',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );

      // Now import items with duplicates & invalid fields
      // Row 1 (Index 0 in items) -> Header is Line 1, so this is Line 2 (Duplicate MKIMP001)
      // Row 2 (Index 1 in items) -> Line 3 (Missing Kode/Nama)
      // Row 3 (Index 2 in items) -> Line 4 (Invalid Prodi Kode)
      const importPayload = {
        items: [
          {
            kodeProdi: 'TI-MK-SETUP',
            kode: 'MKIMP001',
            nama: 'Algoritma & Pemrograman Duplikat',
            sksTotal: 3,
          },
          {
            kodeProdi: 'TI-MK-SETUP',
            kode: '',
            nama: '',
            sksTotal: 3,
          },
          {
            kodeProdi: 'PRODI_TIDAK_ADA',
            kode: 'MKIMP002',
            nama: 'Struktur Data Baru',
            sksTotal: 3,
          },
        ],
      };

      const response = await app.handle(
        new Request('http://localhost/mata-kuliah/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(importPayload),
        }),
      );

      expect(response.status).toBe(200);
      const resBody = (await response.json()) as {
        success: number;
        failed: number;
        errors: { row: number; kode: string; error: string }[];
      };

      expect(resBody.failed).toBe(3);
      expect(resBody.errors.length).toBe(3);

      // Check row 2 error (Line 2 in CSV)
      expect(resBody.errors[0].row).toBe(2);
      expect(resBody.errors[0].error).toContain('sudah terdaftar');

      // Check row 3 error (Line 3 in CSV)
      expect(resBody.errors[1].row).toBe(3);
      expect(resBody.errors[1].error).toContain('Kolom Kode dan Nama wajib diisi');

      // Check row 4 error (Line 4 in CSV)
      expect(resBody.errors[2].row).toBe(4);
      expect(resBody.errors[2].error).toContain('tidak ditemukan');

      // Check CWE-209 compliance: No raw SQL words exposed in error messages
      const stringifiedErrors = JSON.stringify(resBody.errors);
      expect(stringifiedErrors).not.toContain('INSERT');
      expect(stringifiedErrors).not.toContain('SELECT');
      expect(stringifiedErrors).not.toContain('mata_kuliah');
      expect(stringifiedErrors).not.toContain('Failed query');
      expect(stringifiedErrors).not.toContain('violates unique constraint');
    });
  });
});
