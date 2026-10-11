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
  return { prodi, mhs, periodeId: '20252', mhsId: mhs.id };
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

    it('admin (tanpa role kaprodi) ditolak 403 — persetujuan Kaprodi eksplisit', async () => {
      const { mhsId, periodeId } = await seedKhs();
      const adminToken = await getAuthToken('admin-nosign@test.com', 'admin');
      const res = await app.handle(signRequest(mhsId, periodeId, adminToken));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain('Kaprodi');
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
});
