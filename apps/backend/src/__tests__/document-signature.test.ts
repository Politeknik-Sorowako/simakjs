import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { DocumentSignatureService } from '../services/document-signature.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

const SIGN_KEYS = JSON.stringify({ k1: 'a'.repeat(64) });
const VERIFY_BASE = 'https://verify.test';

beforeEach(async () => {
  await clearDatabase();
  process.env.SIGN_HMAC_KEYS = SIGN_KEYS;
  process.env.SIGN_ACTIVE_KID = 'k1';
  process.env.VERIFY_BASE_URL = VERIFY_BASE;
});

async function seedKhs() {
  const [prodi] = await db
    .insert(programStudi)
    .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
    .returning();
  const [dsn] = await db
    .insert(dosen)
    .values({
      nip: '198001012010121001',
      nama: 'Dosen',
      email: 'dosen-test@test.com',
      programStudiId: prodi.id,
      nik: '1234567890123456',
      jenisKelamin: 'L',
      tanggalLahir: '1980-01-01',
    })
    .returning();
  const [mhs] = await db
    .insert(mahasiswa)
    .values({
      nim: '123456',
      nama: 'Test Student',
      email: 'student-sign@test.com',
      programStudiId: prodi.id,
      namaIbuKandung: 'Ibu',
      nik: '1234567890123456',
      jenisKelamin: 'L',
      tanggalLahir: '2000-01-01',
      dosenPaId: dsn.id,
    })
    .returning();
  await db.insert(periodeAkademik).values({ id: '20252', nama: 'Genap 2025/2026', aktif: true });
  const [mk] = await db
    .insert(mataKuliah)
    .values({ kode: 'MK1', nama: 'Mata Kuliah 1', sksTotal: 3, programStudiId: prodi.id })
    .returning();
  const [kelas] = await db
    .insert(kelasKuliah)
    .values({ mataKuliahId: mk.id, periodeId: '20252', namaKelas: 'Kelas A', isLocked: false })
    .returning();
  await db
    .insert(krs)
    .values({
      mahasiswaId: mhs.id,
      kelasKuliahId: kelas.id,
      isApproved: true,
      approvedById: dsn.id,
      approvedAt: new Date(),
      nilaiAngka: '85.00',
      nilaiHuruf: 'A',
      nilaiIndeks: '4.00',
    })
    .returning();
  return { prodi, mhs, periodeId: '20252', mhsId: mhs.id };
}

describe('Document Signature (TTE Fase 1)', () => {
  it('menandatangani KHS menghasilkan QR + verifyUrl dan idempoten', async () => {
    const { mhsId, periodeId } = await seedKhs();
    const adminToken = await getAuthToken('admin-sign@test.com', 'admin');

    const res1 = await app.handle(
      new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as {
      verifyUuid: string;
      verifyUrl: string;
      docHash: string;
      qrDataUrl: string;
    };
    expect(body1.verifyUuid).toBeTruthy();
    expect(body1.qrDataUrl).toContain('data:image/png;base64,');
    expect(body1.verifyUrl).toContain(`${VERIFY_BASE}/v/`);

    // Idempoten: verifyUuid stabil untuk snapshot yang sama.
    const res2 = await app.handle(
      new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      }),
    );
    const body2 = (await res2.json()) as { verifyUuid: string };
    expect(body2.verifyUuid).toBe(body1.verifyUuid);
  });

  it('verifikasi publik VALID dengan identitas ter-mask tanpa auth', async () => {
    const { mhsId, periodeId } = await seedKhs();
    const adminToken = await getAuthToken('admin-sign2@test.com', 'admin');
    const res = await app.handle(
      new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      }),
    );
    const sign = (await res.json()) as { verifyUuid: string };

    // Tanpa header auth sama sekali.
    const verifyRes = await app.handle(new Request(`http://localhost/document-signatures/verify/${sign.verifyUuid}`));
    expect(verifyRes.status).toBe(200);
    const v = (await verifyRes.json()) as { status: string; namaMask: string; nimMask: string; docHashShort: string };
    expect(v.status).toBe('VALID');
    expect(v.namaMask).toBe('T***t');
    expect(v.nimMask).toContain('***');
    expect(v.docHashShort).toHaveLength(16);
  });

  it('revoke membuat verifikasi publik menjadi REVOKED', async () => {
    const { mhsId, periodeId } = await seedKhs();
    const adminToken = await getAuthToken('admin-sign3@test.com', 'admin');
    const res = await app.handle(
      new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      }),
    );
    const sign = (await res.json()) as { verifyUuid: string };

    const revokeRes = await app.handle(
      new Request(`http://localhost/document-signatures/${sign.verifyUuid}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Kesalahan data' }),
      }),
    );
    expect(revokeRes.status).toBe(200);

    const verifyRes = await app.handle(new Request(`http://localhost/document-signatures/verify/${sign.verifyUuid}`));
    expect(verifyRes.status).toBe(410);
    const v = (await verifyRes.json()) as { status: string };
    expect(v.status).toBe('REVOKED');
  });

  it('uuid tidak dikenal mengembalikan 404 NOT_FOUND', async () => {
    const verifyRes = await app.handle(
      new Request('http://localhost/document-signatures/verify/00000000-0000-4000-8000-000000000000'),
    );
    expect(verifyRes.status).toBe(404);
    const v = (await verifyRes.json()) as { status: string };
    expect(v.status).toBe('NOT_FOUND');
  });

  it('mahasiswa hanya dapat memverifikasi UUID (akses publik), bukan revoke', async () => {
    const { mhsId, periodeId } = await seedKhs();
    const adminToken = await getAuthToken('admin-sign4@test.com', 'admin');
    const res = await app.handle(
      new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      }),
    );
    const sign = (await res.json()) as { verifyUuid: string };

    // Revoke oleh non-admin => 403.
    const mhsToken = await getAuthToken('student-sign@test.com', 'mahasiswa');
    const revokeRes = await app.handle(
      new Request(`http://localhost/document-signatures/${sign.verifyUuid}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ reason: 'coba' }),
      }),
    );
    expect(revokeRes.status).toBe(403);
  });
});
