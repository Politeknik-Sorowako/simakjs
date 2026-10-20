import { beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { programStudi, tugasAkhirRubrikKriteria, userProdiScopes, users } from '../models/schema';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

describe('Tugas Akhir - Backlog 3: Manajemen Rubrik Kriteria Penilaian TA per Prodi', () => {
  let adminToken: string;
  let kaprodiToken: string;
  let prodiId1: number;
  let prodiId2: number;
  let createdRubrikId: number;

  beforeAll(async () => {
    // 1. Program studi 1 & 2
    const [p1] = await db
      .insert(programStudi)
      .values({ kode: 'TM-RUBRIK1', nama: 'Teknik Mekatronika Rubrik 1', jenjang: 'D3' })
      .onConflictDoNothing()
      .returning();
    prodiId1 = p1 ? p1.id : (await db.query.programStudi.findFirst())!.id;

    const [p2] = await db
      .insert(programStudi)
      .values({ kode: 'TM-RUBRIK2', nama: 'Teknik Perawatan Rubrik 2', jenjang: 'D3' })
      .onConflictDoNothing()
      .returning();
    prodiId2 = p2 ? p2.id : (await db.query.programStudi.findFirst())!.id;

    // 2. Auth tokens
    adminToken = await getAuthToken('admin-rubrik@test.com', 'admin');
    kaprodiToken = await getAuthToken('kaprodi-rubrik@test.com', 'kaprodi');

    // Berikan scope prodiId1 ke kaprodi
    const [kaprodiUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'kaprodi-rubrik@test.com'))
      .limit(1);
    if (kaprodiUser) {
      await db
        .insert(userProdiScopes)
        .values({ userId: kaprodiUser.id, programStudiId: prodiId1 })
        .onConflictDoNothing();
    }
  });

  describe('1. Endpoint Salin Template Standar BPA 2025', () => {
    it('berhasil menyalin template standar untuk sidang akhir', async () => {
      const res = await app.handle(
        new Request('http://localhost/tugas-akhir/rubrik-kriteria/salin-template', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programStudiId: prodiId1,
            jenisSidang: 'akhir',
          }),
        }),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.count).toBeGreaterThan(0);
      expect(json.items).toBeDefined();
      expect(json.items.length).toBe(18); // 5 A + 3 B + 10 C
    });
  });

  describe('2. Endpoint GET Rubrik Kriteria per Prodi', () => {
    it('mengambil daftar rubrik kriteria untuk prodi dan jenis sidang', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/rubrik-kriteria?programStudiId=${prodiId1}&jenisSidang=akhir`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(18);
    });

    it('menolak akses jika user tidak memiliki kewenangan atas prodi tersebut', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/rubrik-kriteria?programStudiId=${prodiId2}&jenisSidang=akhir`, {
          headers: { Authorization: `Bearer ${kaprodiToken}` },
        }),
      );

      // Kaprodi hanya punya hak di prodiId1
      expect(res.status).toBe(403);
    });
  });

  describe('3. Endpoint CRUD Tambah, Ubah, dan Hapus Rubrik Kriteria', () => {
    it('berhasil menambahkan kriteria baru', async () => {
      const res = await app.handle(
        new Request('http://localhost/tugas-akhir/rubrik-kriteria', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            programStudiId: prodiId1,
            jenisSidang: 'proposal',
            kode: 'P.TEST',
            nama: 'Kriteria Pengujian Otomatis',
            kategori: 'umum',
            deskripsi: 'Panduan uji coba',
            bobot: 25,
            isIndividu: false,
            urutan: 1,
          }),
        }),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.kode).toBe('P.TEST');
      createdRubrikId = json.data.id;
    });

    it('berhasil memperbarui kriteria', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/rubrik-kriteria/${createdRubrikId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nama: 'Kriteria Pengujian Otomatis (Updated)',
            bobot: 30,
          }),
        }),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.nama).toBe('Kriteria Pengujian Otomatis (Updated)');
      expect(json.data.bobot).toBe(30);
    });

    it('berhasil menghapus kriteria yang belum terikat nilai sidang', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/rubrik-kriteria/${createdRubrikId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.softDeleted).toBe(false);

      // Pastikan sudah tidak ada di db
      const [check] = await db
        .select()
        .from(tugasAkhirRubrikKriteria)
        .where(eq(tugasAkhirRubrikKriteria.id, createdRubrikId));
      expect(check).toBeUndefined();
    });
  });
});
