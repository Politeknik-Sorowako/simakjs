import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  userProdiScopes,
  userRoles,
  users,
  visiMisiProdi,
} from '../models/schema';
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

// Endpoint verifikasi publik kini POST + token Turnstile (antibot).
// NODE_ENV=test membuat verifyTurnstile selalu lolos & rate limit dilewati.
function verifyRequest(uuid: string): Request {
  return new Request('http://localhost/document-signatures/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, turnstileToken: 'test-token' }),
  });
}

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
  return { prodi, dsn, mhs, periodeId: '20252', mhsId: mhs.id };
}

/** Kaprodi ter-scope ke sebuah prodi (atau tanpa scope bila prodiId null). */
async function createKaprodiToken(email: string, programStudiId: number | null): Promise<string> {
  const token = await getAuthToken(email, 'kaprodi');
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  // resolveSigner membaca kandidat dari tabel user_roles (bukan kolom legacy).
  await db.insert(userRoles).values({ userId: u.id, role: 'kaprodi' }).onConflictDoNothing();
  if (programStudiId != null) {
    await db.insert(userProdiScopes).values({ userId: u.id, programStudiId }).onConflictDoNothing();
  }
  return token;
}

function signRequest(mhsId: number, periodeId: string, token: string): Request {
  return new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
}

function bulkSignRequest(periodeId: string, mahasiswaIds: number[], token: string): Request {
  return new Request('http://localhost/document-signatures/khs/bulk-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ periodeId, mahasiswaIds }),
  });
}

function signStatusRequest(
  periodeId: string,
  programStudiId: number,
  token: string,
  extra?: { status?: string; limit?: number; page?: number },
): Request {
  const qs = new URLSearchParams({ periodeId, programStudiId: String(programStudiId) });
  if (extra?.status) qs.set('status', extra.status);
  if (extra?.limit) qs.set('limit', String(extra.limit));
  if (extra?.page) qs.set('page', String(extra.page));
  return new Request(`http://localhost/document-signatures/khs/sign-status?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function revokeRequest(uuid: string, token: string, reason: string): Request {
  return new Request(`http://localhost/document-signatures/${uuid}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
}

function bulkRevokeRequest(uuids: string[], reason: string, token: string): Request {
  return new Request('http://localhost/document-signatures/bulk-revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uuids, reason }),
  });
}

/** Tanda tangan satu KHS lalu kembalikan `verifyUuid`-nya. */
async function signAndGetUuid(mhsId: number, periodeId: string, token: string): Promise<string> {
  const res = await app.handle(signRequest(mhsId, periodeId, token));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { verifyUuid: string };
  return body.verifyUuid;
}

/** Mahasiswa tambahan pada prodi yang sama (untuk skenario massal). */
async function addMahasiswa(nim: string, prodiId: number, dsnId: number) {
  const [m] = await db
    .insert(mahasiswa)
    .values({
      nim,
      nama: `Student ${nim}`,
      email: `${nim}@test.com`,
      programStudiId: prodiId,
      namaIbuKandung: 'Ibu',
      // NIK unique per baris (constraint `mahasiswa_nik_unique`).
      nik: `9${nim}`.padEnd(16, '0'),
      jenisKelamin: 'L',
      tanggalLahir: '2000-01-01',
      dosenPaId: dsnId,
    })
    .returning();
  return m;
}

describe('Document Signature (TTE Fase 1)', () => {
  it('menandatangani KHS menghasilkan QR + verifyUrl dan idempoten (Kaprodi in-scope)', async () => {
    const { mhsId, periodeId, prodi } = await seedKhs();
    const kaprodiToken = await createKaprodiToken('kaprodi-sign@test.com', prodi.id);

    const res1 = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as {
      verifyUuid: string;
      verifyUrl: string;
      docHash: string;
      qrDataUrl: string;
      signerNama: string;
      signerJabatan: string | null;
    };
    expect(body1.verifyUuid).toBeTruthy();
    expect(body1.qrDataUrl).toContain('data:image/png;base64,');
    expect(body1.verifyUrl).toContain(`${VERIFY_BASE}/v/`);
    expect(body1.signerNama).toBe('Test User');
    expect(body1.signerJabatan).toContain('Kaprodi');

    // Idempoten: verifyUuid stabil untuk snapshot yang sama.
    const res2 = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
    const body2 = (await res2.json()) as { verifyUuid: string };
    expect(body2.verifyUuid).toBe(body1.verifyUuid);
  });

  it('idempoten lintas pemanggil: Kaprodi lalu super_admin menghasilkan verifyUuid stabil', async () => {
    const { mhsId, periodeId, prodi } = await seedKhs();
    const kaprodiToken = await createKaprodiToken('kaprodi-idem@test.com', prodi.id);

    const res1 = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as { verifyUuid: string; docHash: string };

    // Pemanggil berbeda dengan kewenangan (super_admin darurat) tidak boleh
    // mengubah snapshot, sehingga tidak mencabut QR yang sudah tercetak.
    const superAdminToken = await getAuthToken('superadmin-idem@test.com', 'super_admin');
    const res2 = await app.handle(signRequest(mhsId, periodeId, superAdminToken));
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { verifyUuid: string; docHash: string };
    expect(body2.verifyUuid).toBe(body1.verifyUuid);
    expect(body2.docHash).toBe(body1.docHash);
  });

  it('verifikasi publik VALID dengan identitas ter-mask tanpa auth', async () => {
    const { mhsId, periodeId, prodi } = await seedKhs();
    const kaprodiToken = await createKaprodiToken('kaprodi-sign2@test.com', prodi.id);
    const res = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
    const sign = (await res.json()) as { verifyUuid: string };

    // Tanpa header auth sama sekali.
    const verifyRes = await app.handle(verifyRequest(sign.verifyUuid));
    expect(verifyRes.status).toBe(200);
    const v = (await verifyRes.json()) as { status: string; namaMask: string; nimMask: string; docHashShort: string };
    expect(v.status).toBe('VALID');
    expect(v.namaMask).toBe('T***t');
    expect(v.nimMask).toContain('***');
    expect(v.docHashShort).toHaveLength(16);
  });

  it('revoke membuat verifikasi publik menjadi REVOKED', async () => {
    const { mhsId, periodeId, prodi } = await seedKhs();
    const kaprodiToken = await createKaprodiToken('kaprodi-sign3@test.com', prodi.id);
    const adminToken = await getAuthToken('admin-sign3@test.com', 'admin');
    const res = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
    const sign = (await res.json()) as { verifyUuid: string };

    const revokeRes = await app.handle(
      new Request(`http://localhost/document-signatures/${sign.verifyUuid}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Kesalahan data' }),
      }),
    );
    expect(revokeRes.status).toBe(200);

    const verifyRes = await app.handle(verifyRequest(sign.verifyUuid));
    expect(verifyRes.status).toBe(410);
    const v = (await verifyRes.json()) as { status: string };
    expect(v.status).toBe('REVOKED');
  });

  it('uuid tidak dikenal mengembalikan 404 NOT_FOUND', async () => {
    const verifyRes = await app.handle(verifyRequest('00000000-0000-4000-8000-000000000000'));
    expect(verifyRes.status).toBe(404);
    const v = (await verifyRes.json()) as { status: string };
    expect(v.status).toBe('NOT_FOUND');
  });

  it('body tanpa uuid ditolak 422', async () => {
    const verifyRes = await app.handle(
      new Request('http://localhost/document-signatures/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken: 'test-token' }),
      }),
    );
    expect(verifyRes.status).toBe(422);
  });

  it('endpoint GET lama tidak lagi tersedia', async () => {
    const res = await app.handle(
      new Request('http://localhost/document-signatures/verify/00000000-0000-4000-8000-000000000000'),
    );
    // Route GET dihapus → Elysia mengembalikan 404 (bukan 200).
    expect(res.status).toBe(404);
  });

  it('mahasiswa hanya dapat memverifikasi UUID (akses publik), bukan revoke', async () => {
    const { mhsId, periodeId, prodi } = await seedKhs();
    const kaprodiToken = await createKaprodiToken('kaprodi-sign4@test.com', prodi.id);
    const res = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
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

  describe('otorisasi penerbitan tanda tangan (persetujuan Kaprodi)', () => {
    it('Kaprodi in-scope sukses menandatangani', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-ok@test.com', prodi.id);
      const res = await app.handle(signRequest(mhsId, periodeId, token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { verifyUuid: string; signerJabatan: string | null };
      expect(body.verifyUuid).toBeTruthy();
      expect(body.signerJabatan).toContain('Kaprodi');
    });

    it('Kaprodi out-of-scope ditolak 403', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const [otherProdi] = await db
        .insert(programStudi)
        .values({ kode: 'TI2', nama: 'Teknik Mesin', jenjang: 'D4' })
        .returning();
      const token = await createKaprodiToken('kaprodi-out@test.com', otherProdi.id);
      const res = await app.handle(signRequest(mhsId, periodeId, token));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('scope prodi');
    });

    it('Kaprodi tanpa scope apapun ditolak 403', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-noscope@test.com', null);
      const res = await app.handle(signRequest(mhsId, periodeId, token));
      expect(res.status).toBe(403);
    });

    it('admin (tanpa role kaprodi) BOLEH menandatangani — kebijakan akses prodi/admin', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const adminToken = await getAuthToken('admin-sign-ok@test.com', 'admin');
      const res = await app.handle(signRequest(mhsId, periodeId, adminToken));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { verifyUuid: string; signerNama: string };
      expect(body.verifyUuid).toBeTruthy();
      // Atribusi signer tetap otoritatif (Kaprodi/Pimpinan), bukan admin pemanggil.
      expect(body.signerNama).toBeTruthy();
    });

    it('prodi (tanpa role kaprodi) ditolak 403', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const prodiToken = await getAuthToken('prodi-nosign@test.com', 'prodi');
      const res = await app.handle(signRequest(mhsId, periodeId, prodiToken));
      expect(res.status).toBe(403);
    });

    it('mahasiswa ditolak 403 saat mencoba menandatangani KHS-nya sendiri', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const mhsToken = await getAuthToken('student-sign@test.com', 'mahasiswa');
      const res = await app.handle(signRequest(mhsId, periodeId, mhsToken));
      expect(res.status).toBe(403);
    });

    it('super_admin boleh menandatangani sebagai darurat', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const token = await getAuthToken('superadmin-sign@test.com', 'super_admin');
      const res = await app.handle(signRequest(mhsId, periodeId, token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { verifyUuid: string };
      expect(body.verifyUuid).toBeTruthy();
    });

    it('setelah Kaprodi menandatangani, admin dapat membaca baris existing (getByRef)', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-ref@test.com', prodi.id);
      const signRes = await app.handle(signRequest(mhsId, periodeId, kaprodiToken));
      const sign = (await signRes.json()) as { verifyUuid: string };

      const adminToken = await getAuthToken('admin-ref@test.com', 'admin');
      const refRes = await app.handle(
        new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(refRes.status).toBe(200);
      const body = (await refRes.json()) as { verifyUuid: string } | null;
      expect(body?.verifyUuid).toBe(sign.verifyUuid);
    });

    it('tanda tangan lama tetap terbaca meski pemanggil bukan Kaprodi (grandfather)', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-old@test.com', prodi.id);
      await app.handle(signRequest(mhsId, periodeId, kaprodiToken));

      // Pemirsa staf in-scope (prodi) hanya membaca, tanpa menerbitkan baru.
      const prodiToken = await getAuthToken('prodi-read@test.com', 'prodi');
      const [prodiUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, 'prodi-read@test.com'))
        .limit(1);
      await db.insert(userProdiScopes).values({ userId: prodiUser.id, programStudiId: prodi.id }).onConflictDoNothing();
      const refRes = await app.handle(
        new Request(`http://localhost/document-signatures/khs/${mhsId}/${periodeId}`, {
          headers: { Authorization: `Bearer ${prodiToken}` },
        }),
      );
      expect(refRes.status).toBe(200);
      const body = (await refRes.json()) as { verifyUuid: string } | null;
      expect(body?.verifyUuid).toBeTruthy();
    });
  });

  describe('persetujuan massal KHS (metode A: daftar centang)', () => {
    it('Kaprodi in-scope menandatangani massal dua mahasiswa sekaligus', async () => {
      const { prodi, dsn, mhs, periodeId } = await seedKhs();
      const mhs2 = await addMahasiswa('123457', prodi.id, dsn.id);
      const token = await createKaprodiToken('kaprodi-bulk@test.com', prodi.id);

      const res = await app.handle(bulkSignRequest(periodeId, [mhs.id, mhs2.id], token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number; signedCount: number; failedCount: number; failed: unknown[] };
      expect(body).toMatchObject({ total: 2, signedCount: 2, failedCount: 0, failed: [] });

      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhs2.id}:${periodeId}`);
      expect(row).not.toBeNull();
      expect(row?.signerJabatan).toContain('Kaprodi');
    });

    it('bulk idempoten: run kedua tidak mengganti verifyUuid', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-bulk-idem@test.com', prodi.id);

      const res1 = await app.handle(bulkSignRequest(periodeId, [mhsId], token));
      const body1 = (await res1.json()) as { signedCount: number };
      expect(body1.signedCount).toBe(1);
      const first = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);

      const res2 = await app.handle(bulkSignRequest(periodeId, [mhsId], token));
      const body2 = (await res2.json()) as { signedCount: number; failedCount: number };
      expect(body2.signedCount).toBe(1);
      expect(body2.failedCount).toBe(0);
      const second = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(second?.verifyUuid).toBe(first?.verifyUuid);
    });

    it('admin boleh menandatangani massal (kebijakan baru)', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const token = await getAuthToken('admin-bulk@test.com', 'admin');
      const res = await app.handle(bulkSignRequest(periodeId, [mhsId], token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { signedCount: number };
      expect(body.signedCount).toBe(1);
    });

    it('error per-baris: ID tak dikenal masuk `failed`, sisanya tetap sukses', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-bulk-fail@test.com', prodi.id);

      const res = await app.handle(bulkSignRequest(periodeId, [mhsId, 999999], token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        signedCount: number;
        failedCount: number;
        failed: { mahasiswaId: number; error: string }[];
      };
      expect(body.signedCount).toBe(1);
      expect(body.failedCount).toBe(1);
      expect(body.failed[0].mahasiswaId).toBe(999999);
      expect(body.failed[0].error).toContain('tidak ditemukan');
    });

    it('kaprodi out-of-scope ditolak 403 utuh — tidak ada penandatanganan parsial', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const [otherProdi] = await db
        .insert(programStudi)
        .values({ kode: 'TM-BULK', nama: 'Teknik Mesin', jenjang: 'D4' })
        .returning();
      const token = await createKaprodiToken('kaprodi-bulk-out@test.com', otherProdi.id);

      const res = await app.handle(bulkSignRequest(periodeId, [mhsId], token));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('lingkup');
      expect(prodi.id).not.toBe(otherProdi.id);

      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(row).toBeNull();
    });

    it('role prodi ditolak 403 pada bulk-sign', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const token = await getAuthToken('prodi-bulk@test.com', 'prodi');
      const res = await app.handle(bulkSignRequest(periodeId, [mhsId], token));
      expect(res.status).toBe(403);
      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(row).toBeNull();
    });

    it('validasi schema: lebih dari 50 ID ditolak 422', async () => {
      const { periodeId } = await seedKhs();
      const token = await getAuthToken('admin-bulk-max@test.com', 'admin');
      const ids = Array.from({ length: 51 }, (_, i) => i + 1);
      const res = await app.handle(bulkSignRequest(periodeId, ids, token));
      expect(res.status).toBe(422);
    });

    it('list status: Kaprodi in-scope melihat daftar + flag signed setelah penandatanganan', async () => {
      const { prodi, mhs, periodeId } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-list@test.com', prodi.id);

      const res1 = await app.handle(signStatusRequest(periodeId, prodi.id, token));
      expect(res1.status).toBe(200);
      const body1 = (await res1.json()) as {
        data: { mahasiswaId: number; signed: boolean; signerNama: string | null }[];
        total: number;
        page: number;
        totalPages: number;
      };
      expect(body1.total).toBeGreaterThanOrEqual(1);
      const before = body1.data.find((r) => r.mahasiswaId === mhs.id);
      expect(before?.signed).toBe(false);

      await app.handle(signRequest(mhs.id, periodeId, token));

      const res2 = await app.handle(signStatusRequest(periodeId, prodi.id, token));
      const body2 = (await res2.json()) as {
        data: { mahasiswaId: number; signed: boolean; signerNama: string | null }[];
      };
      const after = body2.data.find((r) => r.mahasiswaId === mhs.id);
      expect(after?.signed).toBe(true);
      expect(after?.signerNama).toBeTruthy();
    });

    it('list status: kaprodi prodi lain ditolak 403', async () => {
      const { prodi, periodeId } = await seedKhs();
      const [otherProdi] = await db
        .insert(programStudi)
        .values({ kode: 'TM-LIST', nama: 'Teknik Mesin', jenjang: 'D4' })
        .returning();
      const token = await createKaprodiToken('kaprodi-list-out@test.com', otherProdi.id);
      const res = await app.handle(signStatusRequest(periodeId, prodi.id, token));
      expect(res.status).toBe(403);
    });

    it('list status: tanpa token 401 & role prodi ditolak 403', async () => {
      const { prodi, periodeId } = await seedKhs();

      const anon = await app.handle(signStatusRequest(periodeId, prodi.id, 'invalid-token'));
      expect(anon.status).toBe(401);

      const prodiToken = await getAuthToken('prodi-list@test.com', 'prodi');
      const res = await app.handle(signStatusRequest(periodeId, prodi.id, prodiToken));
      expect(res.status).toBe(403);
    });
  });

  describe('filter status & page-size daftar TTD', () => {
    it('filter signed/unsigned membagi daftar dengan tepat + verifyUuid per baris', async () => {
      const { prodi, dsn, mhs, periodeId } = await seedKhs();
      const mhs2 = await addMahasiswa('123458', prodi.id, dsn.id);
      const token = await createKaprodiToken('kaprodi-filter@test.com', prodi.id);
      await signAndGetUuid(mhs.id, periodeId, token);

      const allRes = await app.handle(signStatusRequest(periodeId, prodi.id, token));
      expect(allRes.status).toBe(200);
      const all = (await allRes.json()) as {
        total: number;
        data: { mahasiswaId: number; verifyUuid: string | null }[];
      };
      expect(all.total).toBe(2);

      const signedRes = await app.handle(signStatusRequest(periodeId, prodi.id, token, { status: 'signed' }));
      const signed = (await signedRes.json()) as {
        total: number;
        data: { mahasiswaId: number; signed: boolean; verifyUuid: string | null }[];
      };
      expect(signed.total).toBe(1);
      expect(signed.data[0].mahasiswaId).toBe(mhs.id);
      expect(signed.data[0].signed).toBe(true);
      expect(signed.data[0].verifyUuid).toBeTruthy();

      const unsignedRes = await app.handle(signStatusRequest(periodeId, prodi.id, token, { status: 'unsigned' }));
      const unsigned = (await unsignedRes.json()) as {
        total: number;
        data: { mahasiswaId: number; signed: boolean; verifyUuid: string | null }[];
      };
      expect(unsigned.total).toBe(1);
      expect(unsigned.data[0].mahasiswaId).toBe(mhs2.id);
      expect(unsigned.data[0].signed).toBe(false);
      expect(unsigned.data[0].verifyUuid).toBeNull();
    });

    it('status di luar enum ditolak 422', async () => {
      const { prodi, periodeId } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-filter-bad@test.com', prodi.id);
      const res = await app.handle(signStatusRequest(periodeId, prodi.id, token, { status: 'keliru' }));
      expect(res.status).toBe(422);
    });

    it('limit=1 menghitung totalPages 2 & memantulkan limit', async () => {
      const { prodi, dsn, periodeId } = await seedKhs();
      await addMahasiswa('123459', prodi.id, dsn.id);
      const token = await createKaprodiToken('kaprodi-limit@test.com', prodi.id);

      const res = await app.handle(signStatusRequest(periodeId, prodi.id, token, { limit: 1 }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { page: number; limit: number; total: number; totalPages: number };
      expect(body.limit).toBe(1);
      expect(body.total).toBe(2);
      expect(body.totalPages).toBe(2);
      expect(body.page).toBe(1);
    });
  });

  describe('pencabutan tanda tangan (tunggal & massal)', () => {
    it('kaprodi in-scope boleh mencabut tunggal → verifikasi publik 410', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-rev@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, token);

      const res = await app.handle(revokeRequest(uuid, token, 'Koreksi nilai salah input'));
      expect(res.status).toBe(200);

      const verify = await app.handle(verifyRequest(uuid));
      expect(verify.status).toBe(410);
      const body = (await verify.json()) as { status: string };
      expect(body.status).toBe('REVOKED');
    });

    it('kaprodi out-of-scope ditolak 403 & tanda tangan tetap aktif', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-rev-ok@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, kaprodiToken);

      const [otherProdi] = await db
        .insert(programStudi)
        .values({ kode: 'TM-REV', nama: 'Teknik Mesin', jenjang: 'D4' })
        .returning();
      const token = await createKaprodiToken('kaprodi-rev-out@test.com', otherProdi.id);

      const res = await app.handle(revokeRequest(uuid, token, 'Coba cabut lintas prodi'));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('lingkup');

      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(row).not.toBeNull();
    });

    it('role prodi ditolak 403 pada revoke tunggal & massal', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-rev-guard@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, kaprodiToken);
      const prodiToken = await getAuthToken('prodi-rev@test.com', 'prodi');

      const single = await app.handle(revokeRequest(uuid, prodiToken, 'tanpa wewenang'));
      expect(single.status).toBe(403);

      const bulk = await app.handle(bulkRevokeRequest([uuid], 'tanpa wewenang', prodiToken));
      expect(bulk.status).toBe(403);

      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(row).not.toBeNull();
    });

    it('admin mencabut massal dua uuid → kedua verifikasi 410', async () => {
      const { prodi, dsn, mhs, periodeId } = await seedKhs();
      const mhs2 = await addMahasiswa('123460', prodi.id, dsn.id);
      const kaprodiToken = await createKaprodiToken('kaprodi-rev-admin@test.com', prodi.id);
      const uuid1 = await signAndGetUuid(mhs.id, periodeId, kaprodiToken);
      const uuid2 = await signAndGetUuid(mhs2.id, periodeId, kaprodiToken);
      const adminToken = await getAuthToken('admin-bulk-rev@test.com', 'admin');

      const res = await app.handle(bulkRevokeRequest([uuid1, uuid2], 'Pembatalan massal oleh admin', adminToken));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { total: number; revokedCount: number; failedCount: number };
      expect(body).toMatchObject({ total: 2, revokedCount: 2, failedCount: 0 });

      for (const uuid of [uuid1, uuid2]) {
        const verify = await app.handle(verifyRequest(uuid));
        expect(verify.status).toBe(410);
      }
    });

    it('kaprodi in-scope mencabut massal → revokedCount sesuai', async () => {
      const { prodi, dsn, mhs, periodeId } = await seedKhs();
      const mhs2 = await addMahasiswa('123461', prodi.id, dsn.id);
      const token = await createKaprodiToken('kaprodi-rev-bulk@test.com', prodi.id);
      const uuid1 = await signAndGetUuid(mhs.id, periodeId, token);
      const uuid2 = await signAndGetUuid(mhs2.id, periodeId, token);

      const res = await app.handle(bulkRevokeRequest([uuid1, uuid2], 'Koreksi KHS massal', token));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { revokedCount: number; failedCount: number };
      expect(body).toMatchObject({ revokedCount: 2, failedCount: 0 });
    });

    it('uuid tak dikenal masuk daftar failed & sisanya tetap sukses', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-rev-mix@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, kaprodiToken);
      const adminToken = await getAuthToken('admin-bulk-rev-mix@test.com', 'admin');

      const res = await app.handle(
        bulkRevokeRequest([uuid, '00000000-0000-4000-8000-000000000000'], 'Campuran valid & tak dikenal', adminToken),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        total: number;
        revokedCount: number;
        failedCount: number;
        failed: { uuid: string; error: string }[];
      };
      expect(body).toMatchObject({ total: 2, revokedCount: 1, failedCount: 1 });
      expect(body.failed[0].uuid).toBe('00000000-0000-4000-8000-000000000000');
      expect(body.failed[0].error).toContain('tidak ditemukan');

      const verify = await app.handle(verifyRequest(uuid));
      expect(verify.status).toBe(410);
    });

    it('re-revoke idempoten: run kedua dihitung sukses tanpa error', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const token = await createKaprodiToken('kaprodi-rev-idem@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, token);

      const first = await app.handle(bulkRevokeRequest([uuid], 'Pencabutan pertama', token));
      expect(first.status).toBe(200);
      const second = await app.handle(bulkRevokeRequest([uuid], 'Pencabutan kedua', token));
      expect(second.status).toBe(200);
      const body = (await second.json()) as { revokedCount: number; failedCount: number };
      expect(body).toMatchObject({ revokedCount: 1, failedCount: 0 });
    });

    it('massal out-of-scope ditolak 403 utuh — tidak ada parsial', async () => {
      const { mhsId, periodeId, prodi } = await seedKhs();
      const kaprodiToken = await createKaprodiToken('kaprodi-rev-scope@test.com', prodi.id);
      const uuid = await signAndGetUuid(mhsId, periodeId, kaprodiToken);

      const [otherProdi] = await db
        .insert(programStudi)
        .values({ kode: 'TM-REV2', nama: 'Teknik Industri', jenjang: 'D4' })
        .returning();
      const token = await createKaprodiToken('kaprodi-rev-scope-out@test.com', otherProdi.id);

      const res = await app.handle(bulkRevokeRequest([uuid], 'Coba cabut lintas prodi', token));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('lingkup');

      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      expect(row).not.toBeNull();
      const verify = await app.handle(verifyRequest(uuid));
      expect(verify.status).toBe(200);
    });

    it('validasi schema: >50 uuid & reason <3 karakter ditolak 422', async () => {
      const adminToken = await getAuthToken('admin-bulk-rev-schema@test.com', 'admin');

      const tooMany = Array.from({ length: 51 }, () => crypto.randomUUID());
      const res1 = await app.handle(bulkRevokeRequest(tooMany, 'Alasan cukup panjang', adminToken));
      expect(res1.status).toBe(422);

      const res2 = await app.handle(bulkRevokeRequest([crypto.randomUUID()], 'xx', adminToken));
      expect(res2.status).toBe(422);
    });

    it('bulk revoke tanpa token ditolak 401', async () => {
      const res = await app.handle(bulkRevokeRequest([crypto.randomUUID()], 'Alasan cukup panjang', 'invalid'));
      expect(res.status).toBe(401);
    });
  });
});
