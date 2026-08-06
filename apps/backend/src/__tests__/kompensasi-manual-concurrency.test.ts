import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { kompensasiManual, mahasiswa, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Kompensasi Manual Concurrency Protection', () => {
  let adminToken: string;
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_concurrency@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TRPL',
        nama: 'Teknologi Rekayasa Perangkat Lunak',
        jenjang: 'D4',
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20239999',
        nama: 'Mahasiswa Concurrency Test',
        email: 'mhs_concurrency@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('harus mencegah race condition dan tidak pernah melebihi 480 menit per hari pada request simultan', async () => {
    const tanggal = '2026-08-06';
    const durasiPerRequest = 100;
    // Launch 5 concurrent POST requests of 100 mins each (Total attempted: 500 mins)
    const promises = Array.from({ length: 5 }).map(() =>
      app.handle(
        new Request('http://localhost/kompensasi-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal,
            jenisKompen: 'terlambat',
            durasiMenit: durasiPerRequest,
            keterangan: 'simultaneous request test',
          }),
        }),
      ),
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const failedCount = statuses.filter((s) => s === 400).length;

    // Maximum 4 requests of 100 mins (400 mins) can succeed, the 5th (attempting 500 mins) must be rejected
    expect(successCount).toBe(4);
    expect(failedCount).toBe(1);

    // Verify DB total sum does not exceed 480
    const records = await db.select().from(kompensasiManual).where(eq(kompensasiManual.mahasiswaId, mhsId));
    const totalDurationInDb = records.reduce((sum, r) => sum + r.durasiMenit, 0);

    expect(totalDurationInDb).toBe(400);
    expect(totalDurationInDb).toBeLessThanOrEqual(480);
  });
});
