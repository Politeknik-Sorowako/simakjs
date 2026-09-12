import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Program Studi — SK Izin Operasional & Akreditasi', () => {
  let adminToken: string;
  let dosenToken: string;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_prodi_sk@test.com', 'admin');
    dosenToken = await getAuthToken('dosen_prodi_sk@test.com', 'dosen');
  });

  it('admin dapat membuat prodi lengkap dengan data SK izin & akreditasi', async () => {
    const res = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          kode: 'TI',
          nama: 'Teknik Informatika',
          jenjang: 'D4',
          kodeProdiPddikti: '22401',
          nomorSkIzinOperasional: '123/SK/2024',
          tanggalSkIzinOperasional: '2024-01-15',
          tanggalSkIzinOperasionalBerlakuMulai: '2024-02-01',
          fileSkIzinOperasional: '/storage/sk-prodi/izin-1.pdf',
          nilaiAkreditasi: 'Baik Sekali',
          tanggalSkAkreditasi: '2024-03-10',
          tanggalSkAkreditasiBerlakuMulai: '2024-04-01',
          fileSkAkreditasi: '/storage/sk-prodi/akreditasi-1.pdf',
        }),
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      kodeProdiPddikti: string;
      nomorSkIzinOperasional: string;
      nilaiAkreditasi: string;
      tanggalSkAkreditasi: string;
      fileSkAkreditasi: string;
    };
    expect(json.kodeProdiPddikti).toBe('22401');
    expect(json.nomorSkIzinOperasional).toBe('123/SK/2024');
    expect(json.nilaiAkreditasi).toBe('Baik Sekali');
    expect(json.tanggalSkAkreditasi).toBe('2024-03-10');
    expect(json.fileSkAkreditasi).toBe('/storage/sk-prodi/akreditasi-1.pdf');
  });

  it('data SK tersimpan di DB dan dapat diperbarui', async () => {
    const [created] = await db
      .insert(programStudi)
      .values({ kode: 'TS', nama: 'Teknik Sipil', jenjang: 'D4', nilaiAkreditasi: 'Baik' })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/prodi/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          nilaiAkreditasi: 'Unggul',
          nomorSkIzinOperasional: '999/SK/2025',
          tanggalSkIzinOperasional: '2025-05-05',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { nilaiAkreditasi: string; nomorSkIzinOperasional: string };
    expect(json.nilaiAkreditasi).toBe('Unggul');
    expect(json.nomorSkIzinOperasional).toBe('999/SK/2025');

    const [row] = await db.select().from(programStudi);
    expect(row.nilaiAkreditasi).toBe('Unggul');
    expect(row.tanggalSkIzinOperasional).toBe('2025-05-05');
  });

  it('non-admin ditolak (403) saat memperbarui prodi', async () => {
    const [created] = await db
      .insert(programStudi)
      .values({ kode: 'TM', nama: 'Teknik Mesin', jenjang: 'D4' })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/prodi/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ nilaiAkreditasi: 'A' }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
