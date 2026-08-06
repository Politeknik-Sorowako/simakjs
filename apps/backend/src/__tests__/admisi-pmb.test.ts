import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Admisi PMB API', () => {
  let adminToken: string;
  let prodiId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;
  });

  it('harus sukses membuat sesi admisi baru dan mengambil daftarnya', async () => {
    const createSesiRes = await app.handle(
      new Request('http://localhost/admisi/admin/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'PMB-2026',
          nama: 'PMB Gelombang 1 2026',
          tanggalMulai: '2026-01-01',
          tanggalTutup: '2026-08-31',
        }),
      }),
    );
    expect(createSesiRes.status).toBe(201);
    const sesi = await createSesiRes.json();
    expect(sesi.sessionId).toBeDefined();

    const getSesiRes = await app.handle(
      new Request('http://localhost/admisi/admin/sessions', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(getSesiRes.status).toBe(200);
    const activeList = await getSesiRes.json();
    expect(activeList.data.length).toBeGreaterThanOrEqual(1);
  });
});
