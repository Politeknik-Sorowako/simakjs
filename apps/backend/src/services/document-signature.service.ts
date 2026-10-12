import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import QRCode from 'qrcode';
import { documentSignatures, mahasiswa, programStudi, userProdiScopes, userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import {
  canonicalJson,
  getSigningKeyConfig,
  getVerifyBaseUrl,
  hmacSign,
  maskNama,
  maskNim,
  sha256Hex,
} from '../utils/document-signing';
import { formatDateTimeInTimezone } from '../utils/timezone';
import { KhsService } from './khs.service';
import { MahasiswaService } from './mahasiswa.service';
import { PelanggaranService } from './pelanggaran.service';
import { PeriodeAkademikService } from './periode-akademik.service';

export const TENANT_SIMAK = 'simak';

export type DocType = 'KHS' | 'TRANSKRIP';

export interface SignKhsInput {
  mhsId: number;
  periodeId: string;
}

export interface SignResult {
  verifyUuid: string;
  verifyUrl: string;
  docHash: string;
  kid: string;
  signedAt: string;
  signerNama: string;
  signerJabatan: string | null;
  qrDataUrl: string;
}

export interface VerifyResult {
  status: 'VALID' | 'REVOKED' | 'TAMPERED' | 'NOT_FOUND';
  tenant?: string;
  docType?: string;
  namaMask?: string;
  nimMask?: string;
  prodi?: string;
  periodeNama?: string;
  signerNama?: string;
  signerJabatan?: string | null;
  signedAtWITA?: string;
  docHashShort?: string;
}

export interface KhsSignStatusItem {
  mahasiswaId: number;
  nim: string;
  nama: string;
  signed: boolean;
  signerNama: string | null;
  signerJabatan: string | null;
  signedAt: string | null;
}

export interface KhsSignStatusPage {
  data: KhsSignStatusItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BulkSignKhsResult {
  total: number;
  signedCount: number;
  failedCount: number;
  failed: { mahasiswaId: number; error: string }[];
}

interface ResolvedSigner {
  userId: number | null;
  nama: string;
  jabatan: string | null;
}

/**
 * Service TTE Fase 1 (QR Signed-Hash). Semua method statis.
 *
 * Model kepercayaan: `verifyUrl` berisi `verifyUuid` tak-terduga; baris DB
 * menyimpan snapshot kanonik + HMAC-SHA256 (`signature`) yang dihitung dari
 * `<kid>:<docHash>`. Verifikasi publik menghitung ulang HMAC dari kunci `kid`
 * tersimpan sehingga dokumen yang diubah/dipalsukan terdeteksi.
 */
export class DocumentSignatureService {
  /** Baris tanda tangan terbaru yang belum dicabut untuk sebuah referensi dokumen. */
  static async getByRef(docType: DocType, refId: string) {
    const [row] = await db
      .select()
      .from(documentSignatures)
      .where(
        and(
          eq(documentSignatures.tenant, TENANT_SIMAK),
          eq(documentSignatures.docType, docType),
          eq(documentSignatures.refId, refId),
          isNull(documentSignatures.revokedAt),
        ),
      )
      .orderBy(desc(documentSignatures.signedAt))
      .limit(1);
    return row ?? null;
  }

  /**
   * Menandatangani KHS secara idempoten + menghasilkan QR data URL.
   * `opts.withQr = false` melewatkan pembuatan QR (jalur massal cukup butuh
   * status; QR per dokumen tidak dikembalikan sehingga hemat CPU).
   */
  static async signKhs(input: SignKhsInput, opts: { withQr?: boolean } = {}): Promise<SignResult> {
    const { mhsId, periodeId } = input;
    const withQr = opts.withQr ?? true;
    const refId = `khs:${mhsId}:${periodeId}`;

    const mhs = await MahasiswaService.getById(mhsId);
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan.');

    const khs = await KhsService.getKhs(mhsId, periodeId);
    const semester = await KhsService.hitungSemester(mhsId, periodeId);
    const periode = await PeriodeAkademikService.getById(periodeId);
    const nilaiSikap = await PelanggaranService.getNilaiSikap(mhsId, periodeId);

    const mataKuliah = [...(khs.krsList ?? [])]
      .map((k) => ({
        kode: k.mataKuliah.kode,
        nama: k.mataKuliah.nama,
        sks: k.mataKuliah.sksTotal,
        nilaiAngka: k.nilaiAngka ?? null,
        nilaiHuruf: k.nilaiHuruf ?? null,
        nilaiIndeks: k.nilaiIndeks ?? null,
      }))
      .sort((a, b) => a.kode.localeCompare(b.kode));

    const signer = await DocumentSignatureService.resolveSigner(mhs.programStudiId);

    // Catatan: `requestedByUserId` SENGAJA tidak dimasukkan ke payload yang
    // di-hash. Nilai itu berubah tiap pemanggil, sehingga memasukkannya akan
    // mengubah docHash saat dokumen dipicu pengguna berbeda dan mencabut tanda
    // tangan yang sudah dicetak. Jejak pemanggil tetap tercatat oleh audit plugin.
    const payload: Record<string, unknown> = {
      tenant: TENANT_SIMAK,
      docType: 'KHS',
      refId,
      mhsId,
      nim: mhs.nim,
      nama: mhs.nama,
      programStudiId: mhs.programStudiId ?? null,
      prodi: mhs.programStudi?.nama ?? null,
      periodeId,
      periodeNama: periode?.nama ?? null,
      semester,
      ipSemester: khs.summary?.ipSemester ?? null,
      ipk: khs.summary?.ipk ?? null,
      totalSks: khs.summary?.totalSks ?? null,
      totalSksKumulatif: khs.summary?.totalSksKumulatif ?? null,
      nilaiSikap: nilaiSikap?.narasi ?? null,
      mataKuliah,
      signer: { nama: signer.nama, jabatan: signer.jabatan },
      audit: { repository: TENANT_SIMAK },
    };

    const { activeKid, keys } = getSigningKeyConfig();
    const docHash = sha256Hex(canonicalJson(payload));

    // Idempotensi: bila snapshot identik dengan tanda tangan aktif terbaru,
    // pakai ulang baris yang sama (verifyUuid stabil).
    const existing = await DocumentSignatureService.getByRef('KHS', refId);
    if (existing && existing.docHash === docHash) {
      return DocumentSignatureService.toSignResult(existing, withQr);
    }

    // Snapshot berubah → cabut tanda tangan lama (superseded) sebelum insert baru.
    if (existing) {
      await db
        .update(documentSignatures)
        .set({ revokedAt: new Date(), revokeReason: 'Digantikan oleh snapshot KHS terbaru.' })
        .where(eq(documentSignatures.id, existing.id));
    }

    const signature = hmacSign(activeKid, keys[activeKid], docHash);
    const [inserted] = await db
      .insert(documentSignatures)
      .values({
        tenant: TENANT_SIMAK,
        docType: 'KHS',
        refId,
        docHash,
        signature,
        kid: activeKid,
        signerUserId: signer.userId,
        signerNama: signer.nama,
        signerJabatan: signer.jabatan,
        payloadSnapshot: payload,
      })
      .returning();

    return DocumentSignatureService.toSignResult(inserted, withQr);
  }

  /**
   * Daftar mahasiswa per prodi & periode beserta status tanda tangan KHS-nya.
   * Satu query `inArray` untuk seluruh halaman (bukan N+1 per mahasiswa).
   */
  static async listKhsSignStatus(params: {
    programStudiId: number;
    periodeId: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<KhsSignStatusPage> {
    const { programStudiId, periodeId } = params;
    const page = Math.max(1, Math.trunc(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.trunc(params.limit ?? 20)));
    const search = params.search?.trim();

    const whereClause = and(
      eq(mahasiswa.programStudiId, programStudiId),
      eq(mahasiswa.status, 'aktif'),
      search ? or(ilike(mahasiswa.nim, `%${search}%`), ilike(mahasiswa.nama, `%${search}%`)) : undefined,
    );

    const [totalRow] = await db.select({ total: count() }).from(mahasiswa).where(whereClause);
    const total = totalRow?.total ?? 0;

    const rows = await db
      .select({ id: mahasiswa.id, nim: mahasiswa.nim, nama: mahasiswa.nama })
      .from(mahasiswa)
      .where(whereClause)
      .orderBy(asc(mahasiswa.nim))
      .limit(limit)
      .offset((page - 1) * limit);

    const refIds = rows.map((r) => `khs:${r.id}:${periodeId}`);
    const sigRows = refIds.length
      ? await db
          .select()
          .from(documentSignatures)
          .where(
            and(
              eq(documentSignatures.tenant, TENANT_SIMAK),
              eq(documentSignatures.docType, 'KHS'),
              isNull(documentSignatures.revokedAt),
              inArray(documentSignatures.refId, refIds),
            ),
          )
      : [];
    const sigByRef = new Map(sigRows.map((s) => [s.refId, s]));

    const data: KhsSignStatusItem[] = rows.map((r) => {
      const sig = sigByRef.get(`khs:${r.id}:${periodeId}`);
      return {
        mahasiswaId: r.id,
        nim: r.nim,
        nama: r.nama,
        signed: Boolean(sig),
        signerNama: sig?.signerNama ?? null,
        signerJabatan: sig?.signerJabatan ?? null,
        signedAt: sig ? sig.signedAt.toISOString() : null,
      };
    });

    return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Tanda tangan massal: proses PER BARIS dengan penanganan error individual
   * (sesuai standar bulk di repo) — satu mahasiswa gagal tidak membatalkan
   * sisanya. Idempoten: dokumen sudah tanda tangan dengan snapshot sama dihitung
   * sukses tanpa mencabut QR yang sudah tercetak.
   */
  static async signKhsBulk(periodeId: string, mahasiswaIds: number[]): Promise<BulkSignKhsResult> {
    const uniqueIds = [...new Set(mahasiswaIds)];
    const failed: { mahasiswaId: number; error: string }[] = [];
    let signedCount = 0;

    for (const mhsId of uniqueIds) {
      try {
        // QR tidak dibutuhkan pada jalur massal (hanya status) — lewati pembuatannya.
        await DocumentSignatureService.signKhs({ mhsId, periodeId }, { withQr: false });
        signedCount++;
      } catch (e: unknown) {
        failed.push({ mahasiswaId: mhsId, error: e instanceof Error ? e.message : 'Gagal menandatangani KHS.' });
      }
    }

    return { total: uniqueIds.length, signedCount, failedCount: failed.length, failed };
  }

  /** Verifikasi publik berdasarkan `verifyUuid`. */
  static async verify(uuid: string): Promise<VerifyResult> {
    const [row] = await db.select().from(documentSignatures).where(eq(documentSignatures.verifyUuid, uuid)).limit(1);
    if (!row) return { status: 'NOT_FOUND' };

    if (row.revokedAt) {
      return { status: 'REVOKED', docType: row.docType, signedAtWITA: formatDateTimeInTimezone(row.signedAt) };
    }

    const { keys } = getSigningKeyConfig();
    const secret = keys[row.kid];
    if (!secret || hmacSign(row.kid, secret, row.docHash) !== row.signature) {
      return { status: 'TAMPERED', docType: row.docType };
    }

    const snap = row.payloadSnapshot as Record<string, unknown>;
    return {
      status: 'VALID',
      tenant: row.tenant,
      docType: row.docType,
      namaMask: typeof snap.nama === 'string' ? maskNama(snap.nama) : undefined,
      nimMask: typeof snap.nim === 'string' ? maskNim(snap.nim) : undefined,
      prodi: typeof snap.prodi === 'string' ? snap.prodi : undefined,
      periodeNama: typeof snap.periodeNama === 'string' ? snap.periodeNama : undefined,
      signerNama: row.signerNama,
      signerJabatan: row.signerJabatan,
      signedAtWITA: formatDateTimeInTimezone(row.signedAt),
      docHashShort: row.docHash.slice(0, 16),
    };
  }

  /** Mencabut tanda tangan (mis. permintaan pimpinan). */
  static async revoke(uuid: string, userId: number, reason: string): Promise<void> {
    const [row] = await db.select().from(documentSignatures).where(eq(documentSignatures.verifyUuid, uuid)).limit(1);
    if (!row) throw new Error('Tanda tangan tidak ditemukan.');
    if (row.revokedAt) return;
    await db
      .update(documentSignatures)
      .set({ revokedAt: new Date(), revokedBy: userId, revokeReason: reason })
      .where(eq(documentSignatures.id, row.id));
  }

  private static async toSignResult(row: typeof documentSignatures.$inferSelect, withQr = true): Promise<SignResult> {
    const verifyUrl = `${getVerifyBaseUrl()}/v/${row.verifyUuid}`;
    let qrDataUrl = '';
    if (withQr) {
      try {
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
      } catch {
        // QR gagal dibuat — dokumen tetap dapat dicetak tanpa gambar QR.
      }
    }
    return {
      verifyUuid: row.verifyUuid,
      verifyUrl,
      docHash: row.docHash,
      kid: row.kid,
      signedAt: row.signedAt.toISOString(),
      signerNama: row.signerNama,
      signerJabatan: row.signerJabatan,
      qrDataUrl,
    };
  }

  /**
   * Resolusi penandatangan otoritatif (Kaprodi) berdasarkan prodi mahasiswa,
   * terlepas dari siapa yang memicu penandatanganan. Fallback ke label
   * institusi bila tidak ada Kaprodi ter-scope pada prodi tersebut.
   */
  private static async resolveSigner(programStudiId: number | null): Promise<ResolvedSigner> {
    const fallback: ResolvedSigner = { userId: null, nama: 'Pimpinan Politeknik Sorowako', jabatan: null };
    if (!programStudiId) return fallback;

    try {
      const [prodi] = await db
        .select({ nama: programStudi.nama })
        .from(programStudi)
        .where(eq(programStudi.id, programStudiId))
        .limit(1);

      const prodiRoleUserIds = await db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.role, 'kaprodi'));
      const candidateIds = prodiRoleUserIds.map((r) => r.userId);

      const scopedRows = await db
        .select({ userId: userProdiScopes.userId })
        .from(userProdiScopes)
        .where(eq(userProdiScopes.programStudiId, programStudiId));
      const scopedUserIds = new Set(scopedRows.map((s) => s.userId));

      if (candidateIds.length === 0) return fallback;

      // `orderBy` menjaga pilihan penandatangan deterministik saat ada beberapa
      // Kaprodi — jika tidak, signer bisa berubah antar request dan membuat
      // docHash/QR tidak stabil.
      const kaprodiUsers = await db
        .select({ id: users.id, nama: users.nama, isGlobalScope: users.isGlobalScope, prodiIds: users.prodiIds })
        .from(users)
        .where(and(inArray(users.id, candidateIds), eq(users.isActive, true)))
        .orderBy(asc(users.id));

      for (const u of kaprodiUsers) {
        const inProdiIds = Array.isArray(u.prodiIds) && u.prodiIds.includes(programStudiId);
        const inScopedTable = scopedUserIds.has(u.id);
        if (u.isGlobalScope || inProdiIds || inScopedTable) {
          return { userId: u.id, nama: u.nama, jabatan: prodi ? `Kaprodi ${prodi.nama}` : 'Kaprodi' };
        }
      }
      // Tidak ada Kaprodi yang ter-scope pada prodi ini: JANGAN memakai Kaprodi
      // prodi lain (menyesatkan pada dokumen resmi) — pakai label institusi.
    } catch {
      // Abaikan kegagalan lookup; fallback ke label institusi.
    }
    return fallback;
  }
}
