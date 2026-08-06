import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { cpl, cpmk, mataKuliah, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('OBE Matrix & CPL Management API', () => {
  let adminToken: string;
  let prodiId: number;
  let matkulId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'MK001', nama: 'Pemrograman Berbasis Objek', sksTotal: 3, programStudiId: prodiId })
      .returning();
    matkulId = matkul.id;
  });

  it('harus sukses menambah CPL prodi dan pemetaan CPMK-CPL', async () => {
    // 1. Tambah CPL
    const cplRes = await app.handle(
      new Request('http://localhost/cpl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          programStudiId: prodiId,
          kode: 'CPL-01',
          deskripsi: 'Mampu merancang dan mengembangkan perangkat lunak berkualitas',
          kategori: 'keterampilan_khusus',
        }),
      }),
    );
    expect(cplRes.status).toBe(201);
    const cplObj = await cplRes.json();

    // 2. Tambah CPMK
    const cpmkRes = await app.handle(
      new Request('http://localhost/cpmk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mataKuliahId: matkulId,
          kode: 'CPMK-PBO-1',
          deskripsi: 'Menguasai konsep enkapsulasi, pola pewarisan, dan polimorfisme',
        }),
      }),
    );
    expect(cpmkRes.status).toBe(201);
    const cpmkObj = await cpmkRes.json();

    // 3. Petakan CPMK ke CPL
    const mapRes = await app.handle(
      new Request('http://localhost/cpmk-cpl-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          cpmkId: cpmkObj.id,
          cplId: cplObj.id,
        }),
      }),
    );
    expect(mapRes.status).toBe(201);
  });
});
