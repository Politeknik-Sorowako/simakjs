import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, mahasiswa, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Bimbingan Akademik — Akses Detail Pelanggaran & Kompensasi (PA Scope)', () => {
  let adminToken: string;
  let dosenToken: string;
  let dosen2Token: string;
  let mhsToken: string;
  let mhs2Token: string;

  let dosenId: number;
  let dosen2Id: number;
  let mhsId: number;
  let mhs2Id: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin_aks@test.com', 'admin');
    dosenToken = await getAuthToken('dosen_aks@test.com', 'dosen');
    dosen2Token = await getAuthToken('dosen2_aks@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs_aks@test.com', 'mahasiswa');
    mhs2Token = await getAuthToken('mhs2_aks@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: `AKS_${Date.now()}`,
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011011',
        nama: 'Dosen Wali AKS 1',
        email: 'dosen_aks@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosenId = dsn.id;

    const [dsn2] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011012',
        nama: 'Dosen Wali AKS 2',
        email: 'dosen2_aks@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosen2Id = dsn2.id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20210001',
        nama: 'Mahasiswa AKS 1',
        email: 'mhs_aks@test.com',
        programStudiId: prodi.id,
        dosenPaId: dosenId,
        status: 'aktif',
        namaIbuKandung: 'Ibu AKS 1',
        nik: '1234567890123411',
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20210002',
        nama: 'Mahasiswa AKS 2',
        email: 'mhs2_aks@test.com',
        programStudiId: prodi.id,
        dosenPaId: dosen2Id,
        status: 'aktif',
        namaIbuKandung: 'Ibu AKS 2',
        nik: '1234567890123412',
        jenisKelamin: 'P',
        tanggalLahir: '2001-02-02',
      })
      .returning();
    mhs2Id = mhs2.id;

    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });
  });

  describe('GET /bimbingan/mahasiswa/:id/akademik-summary', () => {
    it('dosen PA boleh melihat ringkasan akademik mahasiswa binaannya (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/akademik-summary`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('dosen non-PA ditolak (403)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/akademik-summary`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosen2Token}` },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('admin boleh melihat ringkasan akademik siapa pun (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhs2Id}/akademik-summary`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('mahasiswa boleh melihat ringkasan akademiknya sendiri (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/akademik-summary`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('mahasiswa lain ditolak (403)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhs2Id}/akademik-summary`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /pelanggaran/mahasiswa/:id', () => {
    it('dosen PA boleh melihat riwayat pelanggaran mahasiswa binaannya (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('dosen non-PA ditolak (403)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosen2Token}` },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('admin boleh melihat riwayat pelanggaran siapa pun (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('mahasiswa hanya boleh melihat riwayat pelanggaran sendiri (403 untuk mahasiswa lain)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('GET /presensi/kompensasi/mahasiswa/:id', () => {
    it('dosen PA boleh melihat detail kompensasi mahasiswa binaannya (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('dosen non-PA ditolak (403)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosen2Token}` },
        }),
      );
      expect(res.status).toBe(403);
    });

    it('admin boleh melihat detail kompensasi siapa pun (200)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(res.status).toBe(200);
    });

    it('mahasiswa hanya boleh melihat detail kompensasi sendiri (403 untuk mahasiswa lain)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(res.status).toBe(403);
    });
  });
});
