import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, mahasiswa, periodeAkademik, programStudi } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Bimbingan — Batas Ukuran Lampiran Dinamis', () => {
  let mhsToken: string;
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    await SystemParameterService.set('MAX_BIMBINGAN_ATTACHMENT_MB', '1');

    mhsToken = await getAuthToken('mhs_attach@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `ATT_${Date.now()}`, nama: 'Teknik Elektro', jenjang: 'D4' })
      .returning();

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011081',
        nama: 'Dosen PA Attach',
        email: 'dosen_attach@test.com',
        programStudiId: prodi.id,
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240041',
        nama: 'Mahasiswa Attach',
        email: 'mhs_attach@test.com',
        programStudiId: prodi.id,
        dosenPaId: dsn.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Attach',
        nik: '1234567890123461',
        jenisKelamin: 'L',
        tanggalLahir: '2002-07-07',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: '20261', nama: 'Ganjil 2026/2027', aktif: true });
  });

  function buildForm(sizeBytes: number): FormData {
    const form = new FormData();
    const content = new Uint8Array(sizeBytes);
    form.append('file', new File([content], 'lampiran.pdf', { type: 'application/pdf' }));
    return form;
  }

  it('menolak lampiran yang melebihi MAX_BIMBINGAN_ATTACHMENT_MB (400)', async () => {
    const form = buildForm(2 * 1024 * 1024); // 2 MB > 1 MB
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
        body: form,
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('maksimal 1 MB');
  });

  it('menerima lampiran sesuai batas ukuran (201)', async () => {
    const form = buildForm(256 * 1024); // 256 KB < 1 MB
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
        body: form,
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as { fileUrl: string; fileName: string };
    expect(json.fileUrl).toContain('/storage/bimbingan-attachments/');
    expect(json.fileName).toBe('lampiran.pdf');
  });

  it('menolak format file yang tidak diizinkan (400)', async () => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array(1024)], 'dokumen.exe', { type: 'application/x-msdownload' }));
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
        body: form,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('GET /bimbingan/mahasiswa/:mhsId mengembalikan attachments yang diunggah (tidak ter-strip)', async () => {
    const form = buildForm(128 * 1024);
    const uploadRes = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
        body: form,
      }),
    );
    expect(uploadRes.status).toBe(201);
    const uploaded = (await uploadRes.json()) as { fileName: string; fileUrl: string };

    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { attachments?: { fileName: string; fileUrl: string }[] };
    expect(Array.isArray(json.attachments)).toBe(true);
    expect(json.attachments?.some((a) => a.fileName === uploaded.fileName)).toBe(true);
    expect(json.attachments?.some((a) => a.fileUrl === uploaded.fileUrl)).toBe(true);
  });
});
